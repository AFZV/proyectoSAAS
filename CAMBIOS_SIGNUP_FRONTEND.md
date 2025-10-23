# 🎉 Cambios Aplicados al Frontend - Sign Up

## 📋 Resumen

Se ajustó el flujo de registro del frontend para conectarse correctamente con los endpoints del backend que creamos previamente.

---

## ✅ Archivos Modificados

### **1. `ValidateClientStep.tsx`**

**Cambios:**

- ✅ Cambiado endpoint: `~/api/clientePorNit` → `${NEXT_PUBLIC_API_URL}/clientes-public/existe?nit=XXX`
- ✅ Adaptada respuesta del backend: `{ existe: true, cliente: {...} }`
- ✅ Mapeo de campos: `nombre` (backend) → `nombres` (frontend)

**Endpoint usado:**

```
GET http://localhost:4000/clientes-public/existe?nit=123456789
```

---

### **2. `CreateClientStep.tsx`**

**Cambios principales:**

- ✅ Agregados campos al formulario: `empresaId`, `password`, `confirmPassword`
- ✅ Agregada carga de empresas desde `/clientes-public/empresas`
- ✅ Cambiado endpoint: `~/api/clientes/register` → `${NEXT_PUBLIC_API_URL}/auth-public/cliente-nuevo/registrar`
- ✅ Ahora **crea cliente + usuario + Clerk de una vez** (registro completo)
- ✅ Después de registro exitoso va directo a pantalla de éxito (no pasa por SetPasswordStep)
- ✅ Validación de contraseña: mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial

**Schema actualizado:**

```typescript
{
  nit, razonSocial?, nombre, apellidos, email, telefono,
  direccion, departamento, ciudad,
  empresaId,        // ← NUEVO
  password,         // ← NUEVO
  confirmPassword   // ← NUEVO
}
```

**Endpoint usado:**

```
POST http://localhost:4000/auth-public/cliente-nuevo/registrar
Body: {
  nit, nombre, apellidos, email, password,
  telefono, direccion, departamento, ciudad,
  razonSocial?, empresaId
}
```

**Respuesta esperada:**

```json
{
  "cliente": { "id": "...", "nit": "...", ... },
  "usuario": { "id": "...", "username": "...", ... }
}
```

---

### **3. `SetPasswordStep.tsx`**

**Cambios principales:**

- ✅ Eliminado `useSignUp` de Clerk (ya no crea usuarios directamente)
- ✅ Agregado selector de empresa (carga desde `/clientes-public/empresas`)
- ✅ Cambiado endpoint: ahora llama a `${NEXT_PUBLIC_API_URL}/auth-public/cliente-existente/asignar-password`
- ✅ **Solo se usa para clientes EXISTENTES** (que ya están en BD)
- ✅ Validación de contraseña mejorada: incluye carácter especial obligatorio

**Endpoint usado:**

```
POST http://localhost:4000/auth-public/cliente-existente/asignar-password
Body: {
  clienteId: "uuid-del-cliente",
  email: "cliente@ejemplo.com",
  password: "MiPassword#2025",
  empresaId: "uuid-de-empresa"
}
```

**Respuesta esperada:**

```json
{
  "usuario": { "id": "...", "username": "...", ... }
}
```

---

### **4. `RegisterFlow.tsx`**

**Cambios:**

- ✅ Ajustada función `handleClientCreated()`: ahora va directo a `success` (no a `password`)
- ✅ Eliminado estado `clientDataExtended` (ya no es necesario)

**Flujo actualizado:**

```
ValidateClientStep
  ├─ NIT encontrado → SetPasswordStep → Success
  └─ NIT NO encontrado → CreateClientStep → Success (directo)
```

---

## 🗑️ Archivos Eliminados

### **Proxies innecesarios:**

- ❌ `/app/api/clientePorNit/` - Eliminado (ahora se llama directo al backend)
- ❌ `/app/api/clientes/register/` - Eliminado (ahora se llama directo al backend)

**Justificación:** Los proxies de Next.js ya no son necesarios porque los endpoints del backend son públicos (no requieren autenticación).

---

## 🔗 Endpoints del Backend Usados

| Endpoint                                          | Método | Usado en                              | Propósito                              |
| ------------------------------------------------- | ------ | ------------------------------------- | -------------------------------------- |
| `/clientes/public/existe?nit=XXX`                 | GET    | `ValidateClientStep`                  | Verificar si NIT existe                |
| `/clientes/public/empresas`                       | GET    | `CreateClientStep`, `SetPasswordStep` | Listar empresas públicas               |
| `/auth/public/cliente-nuevo/registrar`            | POST   | `CreateClientStep`                    | Crear cliente + usuario + Clerk        |
| `/auth/public/cliente-existente/asignar-password` | POST   | `SetPasswordStep`                     | Asignar contraseña a cliente existente |

⚠️ **IMPORTANTE:** Las rutas usan `/` no `-` (guion). Ejemplo: `/clientes/public` NO `/clientes-public`

---

## 🧪 Cómo Probar

### **Caso 1: Cliente NUEVO (NIT no existe)**

1. Ir a `/sign-up`
2. Ingresar NIT que NO existe en BD (ej: `999999999`)
3. Llenar formulario completo:
   - Datos personales
   - **Seleccionar empresa**
   - **Crear contraseña** (debe cumplir requisitos)
4. Click en "Crear Cuenta Completa"
5. ✅ Debe ir directo a pantalla de éxito

### **Caso 2: Cliente EXISTENTE (NIT ya registrado)**

1. Ir a `/sign-up`
2. Ingresar NIT que SÍ existe en BD (usar uno de Postman)
3. Va a `SetPasswordStep`
4. Llenar:
   - Email
   - **Seleccionar empresa**
   - Contraseña + confirmación
5. Click en "Crear Cuenta"
6. ✅ Debe ir a pantalla de éxito

---

## ⚠️ Requisitos Previos

### **Variables de Entorno (.env.local)**

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### **Backend debe estar corriendo:**

```bash
cd backend
npm run start:dev
```

---

## 🐛 Posibles Errores y Soluciones

### **Error: "Contraseña pwned"**

- **Causa:** Contraseña filtrada en brechas de seguridad
- **Solución:** Usar contraseña más segura (ej: `ClienteSeguro#2025`)

### **Error: "Email ya registrado"**

- **Causa:** Email ya existe en Clerk
- **Solución:** Usar otro email o iniciar sesión

### **Error: "Cannot find empresas"**

- **Causa:** Backend no está corriendo o no hay empresas con `aceptaClientesPublicos: true`
- **Solución:** Verificar que al menos una empresa tenga ese campo en `true`

### **Error: "Network Error" o "Failed to fetch"**

- **Causa:** Backend no está corriendo
- **Solución:** `cd backend && npm run start:dev`

---

## ✨ Mejoras Implementadas

1. **Flujo más eficiente:** Cliente nuevo se crea en 1 sola llamada HTTP
2. **UX mejorada:** Selector de empresa con nombre + NIT visible
3. **Validación robusta:** Contraseña debe incluir carácter especial
4. **Código más limpio:** Eliminados 2 proxies innecesarios
5. **Manejo de errores:** Mensajes específicos según tipo de error

---

## 📊 Comparación Antes vs Después

### **ANTES (con Clerk directo):**

```
ValidateClientStep → CreateClientStep → SetPasswordStep (Clerk SDK)
                                             ↓
                                    Crear en Clerk directamente
                                    ❌ No crea en BD backend
```

### **DESPUÉS (con backend):**

```
Caso 1 - Cliente nuevo:
ValidateClientStep → CreateClientStep → Success
                           ↓
                    POST /cliente-nuevo/registrar
                    ✅ Crea cliente + usuario + Clerk

Caso 2 - Cliente existente:
ValidateClientStep → SetPasswordStep → Success
                           ↓
                    POST /cliente-existente/asignar-password
                    ✅ Asigna contraseña + crea usuario + Clerk
```

---

## 🎯 Próximos Pasos Sugeridos

1. ✅ Probar flujo completo con NIT nuevo
2. ✅ Probar flujo completo con NIT existente
3. ✅ Probar validaciones de contraseña
4. ⏳ Adaptar páginas `/catalog` e `/invoices` para rol CLIENTE
5. ⏳ Agregar link "Registrarse" en `/sign-in`
6. ⏳ Testing E2E completo

---

**Fecha de cambios:** 19 de Octubre, 2025  
**Estado:** ✅ Implementado y listo para pruebas
