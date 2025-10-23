# 🧪 Testing - Cliente Autogestión

Este documento contiene ejemplos para probar los nuevos endpoints de autogestión de clientes.

## 📋 **Endpoints Públicos (Sin Autenticación)**

### **1. Verificar si NIT existe**

```bash
GET http://localhost:3000/clientes/public/existe?nit=123456789
```

**Respuesta esperada:**

```json
{
  "existe": true,
  "tieneCuenta": false,
  "cliente": {
    "nit": "123456789",
    "nombre": "Juan",
    "apellidos": "Pérez",
    "email": "juan@example.com",
    "razonSocial": "Ferretería El Tornillo",
    "empresas": [
      {
        "id": "empresa-uuid",
        "nombre": "Distribuidora XYZ",
        "nit": "900123456"
      }
    ]
  }
}
```

O si no existe:

```json
{
  "existe": false
}
```

---

### **2. Listar empresas disponibles**

```bash
GET http://localhost:3000/clientes/public/empresas
```

**Respuesta esperada:**

```json
{
  "empresas": [
    {
      "id": "empresa-1-uuid",
      "nombreComercial": "Distribuidora ABC",
      "nit": "900111222",
      "telefono": "3001234567",
      "direccion": "Calle 123 #45-67",
      "logoUrl": "https://..."
    },
    {
      "id": "empresa-2-uuid",
      "nombreComercial": "Almacén XYZ",
      "nit": "900333444",
      "telefono": "3009876543",
      "direccion": "Carrera 78 #90-12",
      "logoUrl": "https://..."
    }
  ]
}
```

---

## 🔐 **Endpoints de Registro (Sin Autenticación)**

### **3. Cliente Existente - Asignar Contraseña**

**Escenario:** El cliente ya fue registrado por un vendedor y ahora quiere crear su cuenta para acceder al sistema.

```bash
POST http://localhost:3000/auth/public/cliente-existente/asignar-password
Content-Type: application/json

{
  "nit": "123456789",
  "empresaId": "empresa-uuid-aqui",
  "password": "MiPassword123!"
}
```

**Respuesta exitosa:**

```json
{
  "success": true,
  "message": "Cuenta creada exitosamente",
  "usuario": {
    "id": "usuario-uuid",
    "email": "juan@example.com",
    "rol": "CLIENTE",
    "nombre": "Juan",
    "apellidos": "Pérez"
  }
}
```

**Errores posibles:**

- `400`: "Cliente no encontrado"
- `400`: "Este cliente ya tiene una cuenta"
- `400`: "Error creando cuenta en Clerk"
- `400`: "No hay admin disponible en esta empresa"

---

### **4. Cliente Nuevo - Autoregistro Completo**

**Escenario:** Cliente nuevo que nunca ha comprado y quiere registrarse.

```bash
POST http://localhost:3000/auth/public/cliente-nuevo/registrar
Content-Type: application/json

{
  "nit": "987654321",
  "razonSocial": "Ferretería Los Pinos LTDA",
  "nombre": "María",
  "apellidos": "González",
  "telefono": "3101234567",
  "email": "maria@ferreterialospinos.com",
  "direccion": "Calle 45 #67-89",
  "departamento": "Antioquia",
  "ciudad": "Medellín",
  "empresaId": "empresa-uuid-aqui",
  "password": "MiPassword456!"
}
```

**Respuesta exitosa:**

```json
{
  "success": true,
  "message": "Cuenta creada exitosamente. Ya puedes iniciar sesión.",
  "usuario": {
    "id": "usuario-uuid",
    "email": "maria@ferreterialospinos.com",
    "rol": "CLIENTE",
    "nombre": "María",
    "apellidos": "González"
  }
}
```

**Errores posibles:**

- `400`: "Este NIT ya está registrado"
- `400`: "Este email ya está registrado"
- `400`: "Error creando cuenta en Clerk"

---

## 🛒 **Endpoints con Autenticación (Cliente logeado)**

### **5. Cliente crea su propio pedido**

**Autenticación:** Bearer token de Clerk (usuario con rol CLIENTE)

```bash
POST http://localhost:3000/pedidos
Authorization: Bearer <token-clerk>
Content-Type: application/json

{
  "observaciones": "Entregar antes del viernes",
  "productos": [
    {
      "productoId": "producto-uuid-1",
      "cantidad": 5,
      "precio": 12500
    },
    {
      "productoId": "producto-uuid-2",
      "cantidad": 10,
      "precio": 8000
    }
  ]
}
```

**Nota importante:**

- ❌ NO enviar `clienteId` en el body (se toma automáticamente del usuario logeado)
- ✅ El sistema usa `usuario.clienteId` automáticamente

**Respuesta exitosa:**

```json
{
  "id": "pedido-uuid",
  "clienteId": "cliente-uuid",
  "usuarioId": "admin-uuid",
  "empresaId": "empresa-uuid",
  "total": 142500,
  "observaciones": "Entregar antes del viernes",
  "fechaPedido": "2025-10-18T...",
  "cliente": { ... },
  "usuario": { ... },
  "productos": [ ... ],
  "estados": [
    {
      "estado": "GENERADO",
      "fechaEstado": "2025-10-18T..."
    }
  ]
}
```

---

### **6. Cliente consulta sus pedidos**

```bash
GET http://localhost:3000/pedidos
Authorization: Bearer <token-clerk>
```

**Respuesta:** Solo los pedidos del cliente logeado (filtrado automático por `clienteId`)

---

## ✅ **Flujo Completo de Prueba**

### **Escenario 1: Cliente Existente**

1. **Verificar NIT:**

   ```bash
   GET /clientes/public/existe?nit=123456789
   ```

2. **Si existe y no tiene cuenta:**

   ```bash
   POST /auth/public/cliente-existente/asignar-password
   {
     "nit": "123456789",
     "empresaId": "...",
     "password": "..."
   }
   ```

3. **Login en Clerk (frontend)** → Obtener token JWT

4. **Crear pedido:**

   ```bash
   POST /pedidos
   Authorization: Bearer <token>
   {
     "observaciones": "...",
     "productos": [...]
   }
   ```

5. **Ver pedidos:**
   ```bash
   GET /pedidos
   Authorization: Bearer <token>
   ```

---

### **Escenario 2: Cliente Nuevo**

1. **Verificar NIT:**

   ```bash
   GET /clientes/public/existe?nit=987654321
   ```

2. **Si NO existe:**

   ```bash
   GET /clientes/public/empresas
   ```

3. **Registrar cliente:**

   ```bash
   POST /auth/public/cliente-nuevo/registrar
   {
     "nit": "987654321",
     "nombre": "...",
     "apellidos": "...",
     ...
   }
   ```

4. **Login en Clerk** → Obtener token

5. **Crear pedido** (igual que escenario 1)

---

## 🔍 **Validaciones Importantes**

### **Backend valida:**

- ✅ NIT solo números (limpia caracteres especiales)
- ✅ Password mínimo 8 caracteres
- ✅ Email válido
- ✅ NIT no duplicado (cliente nuevo)
- ✅ Email no duplicado en Clerk
- ✅ Usuario CLIENTE solo ve sus pedidos
- ✅ Rollback en Clerk si falla creación en BD

### **Roles y Permisos:**

- `CLIENTE`: Puede crear pedidos, ver sus pedidos
- `vendedor`: Puede crear pedidos para clientes, ver sus pedidos
- `admin`: Ve todos los pedidos de la empresa
- `bodega`: Ve todos los pedidos de la empresa

---

## 🛠️ **Herramientas Recomendadas**

- **Postman** o **Thunder Client** (VS Code extension)
- **curl** (línea de comandos)
- **REST Client** (VS Code extension con archivos `.http`)

---

## 📝 **Notas Técnicas**

### **Diferencias entre Vendedor y Cliente creando pedidos:**

| Aspecto        | Vendedor/Admin                                   | Cliente                                   |
| -------------- | ------------------------------------------------ | ----------------------------------------- |
| **clienteId**  | Desde body `data.clienteId`                      | Desde usuario logeado `usuario.clienteId` |
| **vendedorId** | Se calcula según regla admin/vendedor            | Se busca en `ClienteEmpresa.usuarioId`    |
| **Validación** | Verifica relación `ClienteEmpresa`               | Verifica que cliente esté vinculado       |
| **Permisos**   | Puede crear para cualquier cliente de su empresa | Solo puede crear para sí mismo            |

### **Base de Datos:**

Tras registro exitoso, se crea:

1. **Usuario** en Clerk (Admin API)
2. **Usuario** en BD (con `clienteId` y `rol=CLIENTE`)
3. **Cliente** (si es nuevo)
4. **ClienteEmpresa** (con `usuarioId=admin` de la empresa)

---

## 🚨 **Troubleshooting**

### Error: "Usuario cliente no vinculado correctamente"

**Causa:** El usuario tiene rol CLIENTE pero no tiene `clienteId`
**Solución:** Verificar que el registro completó correctamente

### Error: "No hay admin disponible en esta empresa"

**Causa:** La empresa no tiene usuarios con rol `admin` activos
**Solución:** Crear un usuario admin para la empresa

### Error: "Este email ya está registrado"

**Causa:** El email ya existe en Clerk
**Solución:** El cliente debe usar "recuperar contraseña" en Clerk

---

## 📧 **Soporte**

Para reportar bugs o solicitar features, contactar al equipo de desarrollo.
