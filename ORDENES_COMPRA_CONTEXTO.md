# Contexto para implementar: Módulo Órdenes de Compra

> Pásame este archivo al inicio de la sesión de implementación.
> Proyecto: ProyectoSAAS — NestJS (backend) + Next.js App Router (frontend) + Prisma + PostgreSQL

---

## 1. Stack y patrones del proyecto

- **Backend:** NestJS, Prisma, PostgreSQL (Neon), guards `UsuarioGuard` + `RolesGuard`, decorador `@Roles()`
- **Frontend:** Next.js 14 App Router, Tailwind, shadcn/ui, TanStack Table, Clerk auth (`useAuth`, `getToken`)
- **Storage:** Hetzner S3 via `HetznerStorageService` — **NO usar para este módulo**
- **Patrón de roles:** `admin`, `vendedor`, `bodega`, `superadmin`
- **Patrón endpoints protegidos:** `@UseGuards(UsuarioGuard, RolesGuard)` + `@Roles('admin')`
- **Patrón usuario en requests:** `req.usuario` inyectado por `UsuarioGuard`, tipo `UsuarioPayload` con `{ id, empresaId, rol }`

---

## 2. Qué existe en la BD que usaremos

### Producto (campos clave para OC)
```
referencia           String
precioCompra         Float
precioCompraExterior Float?
monedaCompraExterior String?   // "USD", "EUR", etc.
unidadesPorBulto     Int
pesoPorBulto         Float     // kg
cubicajePorBulto     Float     // m³
nombre               String
descripcion          String?
```

### Proveedores
```
idProveedor    String (PK)
identificacion String
razonsocial    String
telefono       String
direccion      String
```

### ProveedorEmpresa
- Tabla intermedia proveedor ↔ empresa
- Endpoint existente: `GET /proveedores` retorna proveedores de la empresa

### Compras / DetalleCompra (solo referencia de estructura, NO se modifica)
```
Compras:       idCompra, idEmpresa, idProveedor, FechaCompra, recibido
DetalleCompra: idDetalleCompra, idCompra, idProducto, cantidad, precioUnitario
```

---

## 3. Decisiones de diseño (todas cerradas)

| Decisión | Resolución |
|---|---|
| Excel en Hetzner | NO — se genera en memoria con `exceljs` y se descarga directamente como stream |
| Conversión de moneda | NO — precio en moneda original del producto. Excel agrupa subtotales por moneda |
| UI de selección de productos | Misma grilla del Catálogo de pedidos (`ProductCard`, `CartSidebar`) con stock visible |
| Precio mostrado en grilla | `precioCompraExterior` + `monedaCompraExterior` si existen, sino `precioCompra` COP |
| Campo extra en ProductCard | Mostrar `unidadesPorBulto` |
| Convertir OC en Compra real | NO — la OC es el documento final, módulo independiente |
| Identificador visible | UUID interno (mostrar primeros 8 chars como referencia legible en UI) |
| Envío por email | NO — solo descarga manual |
| Acceso | Solo `admin` |

---

## 4. Modelos Prisma a agregar

```prisma
// En schema.prisma

enum EstadoOrdenCompra {
  BORRADOR
  ENVIADA
  CONFIRMADA
  CANCELADA
}

model OrdenCompra {
  id            String            @id @default(uuid())
  empresaId     String
  proveedorId   String
  fechaCreacion DateTime          @default(now())
  estado        EstadoOrdenCompra @default(BORRADOR)
  observaciones String?           @db.Text

  empresa   Empresa     @relation(fields: [empresaId], references: [id])
  proveedor Proveedores @relation(fields: [proveedorId], references: [idProveedor])
  detalles  DetalleOrdenCompra[]
}

model DetalleOrdenCompra {
  id             String  @id @default(uuid())
  ordenId        String
  productoId     String
  cantidad       Int
  precioUnitario Float
  moneda         String  @default("COP")
  bultos         Float   // cantidad / unidadesPorBulto
  pesoTotal      Float   // bultos * pesoPorBulto
  cubicaje       Float   // bultos * cubicajePorBulto

  orden    OrdenCompra @relation(fields: [ordenId], references: [id], onDelete: Cascade)
  producto Producto    @relation(fields: [productoId], references: [id])
}
```

### Relaciones inversas a agregar en modelos existentes
```prisma
// model Empresa      → agregar: ordenesCompra OrdenCompra[]
// model Proveedores  → agregar: ordenesCompra OrdenCompra[]
// model Producto     → agregar: detallesOrdenCompra DetalleOrdenCompra[]
```

### Comando
```bash
npx prisma migrate dev --name add_ordenes_compra
npx prisma generate
```

---

## 5. Backend — estructura de archivos a crear

```
backend/src/ordenes-compra/
  ordenes-compra.module.ts
  ordenes-compra.controller.ts
  ordenes-compra.service.ts
  dto/
    create-orden-compra.dto.ts
    update-orden-compra.dto.ts
```

### DTOs

```typescript
// create-orden-compra.dto.ts
import { IsString, IsOptional, IsArray, ValidateNested, IsInt, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

class DetalleOrdenDto {
  @IsString() productoId: string;
  @IsInt() @Min(1) cantidad: number;
  @IsNumber() precioUnitario: number;
  @IsString() moneda: string;
}

export class CreateOrdenCompraDto {
  @IsString() proveedorId: string;
  @IsOptional() @IsString() observaciones?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => DetalleOrdenDto)
  detalles: DetalleOrdenDto[];
}

// update-orden-compra.dto.ts
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoOrdenCompra } from '@prisma/client';

export class UpdateOrdenCompraDto {
  @IsOptional() @IsEnum(EstadoOrdenCompra) estado?: EstadoOrdenCompra;
  @IsOptional() @IsString() observaciones?: string;
}
```

### Endpoints

```
POST   /ordenes-compra           → crear orden + detalles (calcula bultos/peso/cubicaje)
GET    /ordenes-compra           → listar órdenes de la empresa
GET    /ordenes-compra/:id       → detalle completo con productos
PATCH  /ordenes-compra/:id       → actualizar estado u observaciones
DELETE /ordenes-compra/:id       → solo si estado === BORRADOR
GET    /ordenes-compra/:id/excel → genera Excel en buffer, retorna como stream (res.download)
```

### Lógica de cálculo en el service (crear)
```typescript
// Por cada detalle recibido:
const producto = await prisma.producto.findUnique({ where: { id: detalle.productoId } });
const bultos    = detalle.cantidad / producto.unidadesPorBulto;
const pesoTotal = bultos * producto.pesoPorBulto;
const cubicaje  = bultos * producto.cubicajePorBulto;
// moneda: usar producto.monedaCompraExterior ?? 'COP'
// precioUnitario: usar producto.precioCompraExterior ?? producto.precioCompra
```

### Excel con exceljs — implementar en service
```typescript
async generarExcel(id: string, usuario: UsuarioPayload): Promise<Buffer> {
  // 1. Traer orden con include: { proveedor, empresa, detalles: { include: { producto } } }
  // 2. Crear Workbook → addWorksheet
  // 3. Cabecera: empresa.nombreComercial, proveedor.razonsocial+identificacion+telefono, fecha, id.slice(0,8)
  // 4. Columnas: Referencia | Descripción | Cantidad | Bultos | Precio Unit. | Moneda | Subtotal | Peso(kg) | Cubicaje(m³)
  // 5. Filas: una por detalle
  // 6. Pie: fila de totales generales + subtotales agrupados por moneda
  // 7. return (await workbook.xlsx.writeBuffer()) as Buffer
}
```

### Controller — endpoint Excel
```typescript
@Get(':id/excel')
async descargarExcel(
  @Param('id') id: string,
  @Req() req: UsuarioRequest,
  @Res() res: Response,
) {
  const buffer = await this.service.generarExcel(id, req.usuario);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="OC-${id.slice(0, 8)}.xlsx"`);
  res.send(buffer);
}
```

### Registrar en AppModule
```typescript
// backend/src/app.module.ts → agregar OrdenesCompraModule a imports[]
```

### Instalar exceljs si no está
```bash
cd backend && npm install exceljs
```

---

## 6. Frontend — estructura de archivos a crear

```
frontend/app/(routes)/ordenes-compra/
  page.tsx
  components/
    HeaderOrdenesCompra/
      HeaderOrdenesCompra.tsx     ← título + botón "Nueva Orden"
      index.ts
    ListOrdenesCompra/
      ListOrdenesCompra.tsx
      columns.tsx                 ← columnas: ID, proveedor, fecha, estado, acciones
      data-table.tsx              ← copiar de clientes/data-table.tsx
      index.ts
    CrearOrdenCompraModal/
      CrearOrdenCompraModal.tsx   ← paso 1: proveedor | paso 2: grilla + sidebar
      index.ts
  services/
    ordenes-compra.service.ts
```

### Componentes del Catálogo a reutilizar
```
frontend/app/(routes)/catalog/(components)/
  ProductCard      → reutilizar, agregar prop unidadesPorBulto, cambiar precio a precioCompra
  CartSidebar      → reutilizar, cambiar título y agrupar subtotales por moneda
```

### Service frontend
```typescript
// services/ordenes-compra.service.ts
const API = process.env.NEXT_PUBLIC_API_URL;

export const ordenesCompraService = {
  crear:      (token, body)    => fetch(`${API}/ordenes-compra`, { method:'POST', ... }),
  listar:     (token)          => fetch(`${API}/ordenes-compra`, { headers:{ Authorization:`Bearer ${token}` } }),
  detalle:    (token, id)      => fetch(`${API}/ordenes-compra/${id}`, ...),
  actualizar: (token, id, body)=> fetch(`${API}/ordenes-compra/${id}`, { method:'PATCH', ... }),
  eliminar:   (token, id)      => fetch(`${API}/ordenes-compra/${id}`, { method:'DELETE', ... }),

  descargarExcel: async (token, id) => {
    const res  = await fetch(`${API}/ordenes-compra/${id}/excel`, { headers:{ Authorization:`Bearer ${token}` } });
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `OC-${id.slice(0,8)}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  },
};
```

### Tabla lista de órdenes — columnas
| Columna | Dato |
|---|---|
| ID | `id.slice(0,8)` |
| Proveedor | `proveedor.razonsocial` |
| Fecha | `fechaCreacion` formateada |
| Productos | count de detalles |
| Estado | badge: BORRADOR=gris / ENVIADA=azul / CONFIRMADA=verde / CANCELADA=rojo |
| Acciones | Descargar Excel / Cambiar estado / Eliminar (solo BORRADOR) |

### Flujo modal creación
```
Paso 1: dropdown de proveedores (GET /proveedores)
Paso 2: layout 2 columnas
  Izquierda → grilla ProductCard (reutilizar catálogo, endpoint GET /catalog o /productos)
               Card muestra: imagen, nombre, stock, unidadesPorBulto, precioCompra+moneda
  Derecha   → CartSidebar adaptado
               subtotales por moneda, total bultos/peso/cubicaje, observaciones
Botón "Generar Orden" → POST /ordenes-compra → cerrar modal → refresh lista
```

---

## 7. RespaldosService — actualizar backup

En `backend/src/respaldos/respaldos.service.ts`:

```typescript
// 1. Agregar a interfaz BackupData:
ordenesCompra?: OrdenCompra[];
detallesOrdenCompra?: DetalleOrdenCompra[];

// 2. Agregar queries en generarRespaldoEmpresa():
ordenesCompra: await this.prisma.ordenCompra.findMany({ where: { empresaId } }),
detallesOrdenCompra: await this.prisma.detalleOrdenCompra.findMany({
  where: { orden: { empresaId } },
}),

// 3. Agregar en generarSQLConUpsert():
if (data.ordenesCompra?.length)       generarInsert('OrdenCompra', data.ordenesCompra, 'id');
if (data.detallesOrdenCompra?.length) generarInsert('DetalleOrdenCompra', data.detallesOrdenCompra, 'id');
```

---

## 8. Orden de ejecución recomendado

```
1.  schema.prisma → migrate → generate
2.  RespaldosService (actualizar backup)
3.  DTOs backend
4.  ordenes-compra.service.ts (crear, listar, detalle, actualizar, eliminar)
5.  ordenes-compra.service.ts (generarExcel)
6.  ordenes-compra.controller.ts
7.  Registrar OrdenesCompraModule en AppModule
8.  Probar todos los endpoints (Postman / Thunder Client)
9.  ordenes-compra.service.ts (frontend)
10. ListOrdenesCompra (tabla + columns + data-table)
11. CrearOrdenCompraModal (reutilizando componentes del catálogo)
12. page.tsx + HeaderOrdenesCompra
13. Agregar ruta /ordenes-compra al menú lateral (visible solo para admin)
```

---

## 9. Checklist antes de deploy

- [ ] `prisma migrate` sin errores en producción
- [ ] `prisma generate` actualizado
- [ ] POST crea orden con bultos/peso/cubicaje calculados correctamente
- [ ] GET excel descarga archivo con datos completos y subtotales por moneda
- [ ] Admin ve `/ordenes-compra` en el menú
- [ ] Vendedor NO ve la ruta
- [ ] DELETE solo funciona en estado BORRADOR
- [ ] RespaldosService incluye las nuevas tablas
