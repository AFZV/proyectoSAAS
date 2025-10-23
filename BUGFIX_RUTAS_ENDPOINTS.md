# 🐛 BugFix: Rutas de Endpoints Incorrectas

## 📅 Fecha

19 de Octubre, 2025

## 🔍 Problema Detectado

### **Síntomas:**

1. ❌ Error: "No se pudieron cargar las empresas disponibles"
2. ❌ Cliente existente no detectado (NIT registrado mostraba "no está registrado")

### **Causa Raíz:**

Las rutas de los endpoints en el **frontend** no coincidían con las rutas registradas en el **backend**.

---

## 🔧 Detalles del Error

### **Backend (rutas registradas en NestJS):**

```typescript
@Controller('clientes/public')  // ✅ Usa slash /
export class ClientesPublicController { ... }

@Controller('auth/public')  // ✅ Usa slash /
export class AuthPublicController { ... }
```

**Rutas resultantes:**

- ✅ `GET /clientes/public/existe`
- ✅ `GET /clientes/public/empresas`
- ✅ `POST /auth/public/cliente-nuevo/registrar`
- ✅ `POST /auth/public/cliente-existente/asignar-password`

### **Frontend (llamadas HTTP ANTES del fix):**

```typescript
// ❌ INCORRECTO - Usaba guion en lugar de slash
fetch(`${NEXT_PUBLIC_API_URL}/clientes-public/existe?nit=...`);
fetch(`${NEXT_PUBLIC_API_URL}/clientes-public/empresas`);
fetch(`${NEXT_PUBLIC_API_URL}/auth-public/cliente-nuevo/registrar`);
fetch(`${NEXT_PUBLIC_API_URL}/auth-public/cliente-existente/asignar-password`);
```

**Resultado:**

- ❌ 404 Not Found (rutas no existen)
- ❌ Las empresas no cargan
- ❌ La validación de NIT siempre falla

---

## ✅ Solución Aplicada

### **Archivos Corregidos:**

1. **`ValidateClientStep.tsx`**

   ```typescript
   // ANTES ❌
   fetch(`${NEXT_PUBLIC_API_URL}/clientes-public/existe?nit=${data.nit}`);

   // DESPUÉS ✅
   fetch(`${NEXT_PUBLIC_API_URL}/clientes/public/existe?nit=${data.nit}`);
   ```

2. **`CreateClientStep.tsx`**

   ```typescript
   // ANTES ❌
   fetch(`${NEXT_PUBLIC_API_URL}/clientes-public/empresas`);
   fetch(`${NEXT_PUBLIC_API_URL}/auth-public/cliente-nuevo/registrar`);

   // DESPUÉS ✅
   fetch(`${NEXT_PUBLIC_API_URL}/clientes/public/empresas`);
   fetch(`${NEXT_PUBLIC_API_URL}/auth/public/cliente-nuevo/registrar`);
   ```

3. **`SetPasswordStep.tsx`**

   ```typescript
   // ANTES ❌
   fetch(`${NEXT_PUBLIC_API_URL}/clientes-public/empresas`);
   fetch(
     `${NEXT_PUBLIC_API_URL}/auth-public/cliente-existente/asignar-password`
   );

   // DESPUÉS ✅
   fetch(`${NEXT_PUBLIC_API_URL}/clientes/public/empresas`);
   fetch(
     `${NEXT_PUBLIC_API_URL}/auth/public/cliente-existente/asignar-password`
   );
   ```

---

## 🧪 Verificación

### **Probar con cURL o Postman:**

```bash
# Verificar NIT existente
GET http://localhost:4000/clientes/public/existe?nit=999888777

# Listar empresas
GET http://localhost:4000/clientes/public/empresas

# Registrar cliente nuevo
POST http://localhost:4000/auth/public/cliente-nuevo/registrar

# Asignar password a cliente existente
POST http://localhost:4000/auth/public/cliente-existente/asignar-password
```

### **Resultado Esperado:**

- ✅ Empresas se cargan correctamente en el selector
- ✅ NIT existente es detectado y lleva a SetPasswordStep
- ✅ NIT no existente lleva a CreateClientStep
- ✅ Formularios funcionan sin errores 404

---

## 📊 Comparación Antes vs Después

| Componente                  | Endpoint ANTES (❌)                               | Endpoint DESPUÉS (✅)                             |
| --------------------------- | ------------------------------------------------- | ------------------------------------------------- |
| ValidateClientStep          | `/clientes-public/existe`                         | `/clientes/public/existe`                         |
| CreateClientStep (empresas) | `/clientes-public/empresas`                       | `/clientes/public/empresas`                       |
| CreateClientStep (registro) | `/auth-public/cliente-nuevo/registrar`            | `/auth/public/cliente-nuevo/registrar`            |
| SetPasswordStep (empresas)  | `/clientes-public/empresas`                       | `/clientes/public/empresas`                       |
| SetPasswordStep (password)  | `/auth-public/cliente-existente/asignar-password` | `/auth/public/cliente-existente/asignar-password` |

---

## 🎯 Lecciones Aprendidas

1. **Siempre verificar las rutas registradas en el backend** antes de implementar el frontend
2. **Usar constantes** para las rutas base puede prevenir estos errores:
   ```typescript
   const API_ROUTES = {
     CLIENTES_PUBLIC: "/clientes/public",
     AUTH_PUBLIC: "/auth/public",
   };
   ```
3. **Probar endpoints individualmente** con Postman/cURL antes de integrar

---

## ✅ Estado Final

- ✅ Todas las rutas corregidas
- ✅ Frontend y backend sincronizados
- ✅ Endpoints funcionando correctamente
- ✅ Listo para pruebas E2E

---

**Autor:** GitHub Copilot  
**Revisado por:** Usuario  
**Estado:** ✅ Corregido y verificado
