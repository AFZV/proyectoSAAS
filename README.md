# ProyectoSAAS

Aplicación SaaS de gestión empresarial con módulos de inventario, clientes, proveedores, facturación, pagos y reportes.

## Tecnologías

| Componente | Tecnología |
|---|---|
| Backend | NestJS + TypeScript |
| Frontend | Next.js 14 + React 18 + Tailwind CSS |
| Base de datos | PostgreSQL + Prisma ORM |
| Autenticación | Clerk |
| Almacenamiento | Cloudinary, Hetzner Storage |
| Email | Resend |

---

## Requisitos previos

- **Node.js** v18 o superior
- **npm** v9 o superior
- **PostgreSQL** 14+ (o Docker para levantarlo automáticamente)
- Cuenta en [Clerk](https://clerk.com) para autenticación
- (Opcional) Cuenta en Cloudinary, Hetzner, Resend

---

## Configuración rápida

### 1. Clonar el repositorio

```bash
git clone https://github.com/AFZV/proyectoSAAS.git
cd proyectoSAAS
```

### 2. Levantar la base de datos con Docker

```bash
docker compose up -d
```

Esto inicia un contenedor PostgreSQL en `localhost:5432` con usuario `postgres`, contraseña `postgres` y base de datos `proyectosaas`.

> Si ya tienes PostgreSQL instalado localmente, puedes omitir este paso y configurar tu `DATABASE_URL` en el `.env`.

### 3. Configurar variables de entorno

**Backend:**

```bash
cp backend/.env.example backend/.env
# Edita backend/.env con tus credenciales reales
```

**Frontend:**

```bash
cp frontend/.env.example frontend/.env.local
# Edita frontend/.env.local con tus credenciales reales
```

### 4. Instalar dependencias

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 5. Configurar la base de datos

```bash
cd backend

# Generar el cliente Prisma
npx prisma generate

# Aplicar migraciones
npx prisma migrate dev
```

### 6. Iniciar la aplicación

Abre **dos terminales**:

**Terminal 1 – Backend (puerto 4000):**

```bash
cd backend
npm run start:dev
```

**Terminal 2 – Frontend (puerto 3000):**

```bash
cd frontend
npm run dev
```

Abre tu navegador en: **http://localhost:3000**

---

## Cómo probar (Testing)

### Tests unitarios del Backend

El backend usa **Jest** como framework de pruebas. Los tests unitarios validan la lógica de cada servicio de forma aislada usando mocks.

```bash
cd backend

# Ejecutar todos los tests unitarios
npm test

# Ejecutar tests con modo watch (se re-ejecutan al guardar)
npm run test:watch

# Ejecutar tests con reporte de cobertura
npm run test:cov

# Ejecutar un test específico
npx jest --testPathPattern=empresa
```

### Tests E2E (End-to-End) del Backend

Los tests E2E validan los endpoints HTTP completos:

```bash
cd backend
npm run test:e2e
```

### Lint y formateo

```bash
# Backend
cd backend
npm run lint      # Verificar estilo de código
npm run format    # Formatear automáticamente

# Frontend
cd frontend
npm run lint      # Verificar estilo de código
```

### Probar manualmente con herramientas HTTP

Puedes probar los endpoints del backend usando:

- **curl** desde la terminal
- **[Postman](https://www.postman.com/)**
- **[Insomnia](https://insomnia.rest/)**
- La extensión **REST Client** de VS Code

**Ejemplo con curl:**

```bash
# Verificar que el backend está corriendo
curl http://localhost:4000

# Ejemplo: Obtener todas las empresas (requiere autenticación)
curl -H "Authorization: Bearer TU_TOKEN" http://localhost:4000/empresa/all
```

### Explorar la base de datos

Prisma incluye una herramienta visual para explorar la base de datos:

```bash
cd backend
npx prisma studio
```

Esto abre un panel web en **http://localhost:5555** donde puedes ver y editar los datos directamente.

---

## Estructura del proyecto

```
proyectoSAAS/
├── backend/                 # API NestJS
│   ├── src/
│   │   ├── empresa/         # Módulo de empresas
│   │   ├── clientes/        # Módulo de clientes
│   │   ├── productos/       # Módulo de productos
│   │   ├── proveedores/     # Módulo de proveedores
│   │   ├── pedidos/         # Módulo de pedidos
│   │   ├── compras/         # Módulo de compras
│   │   ├── inventario/      # Módulo de inventario
│   │   ├── prisma/          # Servicio de base de datos
│   │   └── ...              # Más módulos
│   ├── prisma/
│   │   └── schema.prisma    # Esquema de la base de datos
│   └── test/                # Tests E2E
├── frontend/                # App Next.js
│   ├── app/                 # Páginas y rutas
│   ├── components/          # Componentes reutilizables
│   └── lib/                 # Utilidades
├── docker-compose.yml       # PostgreSQL local
└── README.md                # Este archivo
```

---

## Comandos útiles

| Comando | Descripción |
|---|---|
| `docker compose up -d` | Iniciar PostgreSQL |
| `docker compose down` | Detener PostgreSQL |
| `cd backend && npm run start:dev` | Iniciar backend en modo desarrollo |
| `cd frontend && npm run dev` | Iniciar frontend en modo desarrollo |
| `cd backend && npm test` | Ejecutar tests unitarios |
| `cd backend && npm run test:e2e` | Ejecutar tests E2E |
| `cd backend && npx prisma studio` | Explorar base de datos visualmente |
| `cd backend && npx prisma migrate dev` | Aplicar migraciones pendientes |
| `cd backend && npx prisma generate` | Regenerar cliente Prisma |
