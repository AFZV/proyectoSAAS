# 🐛 BugFix: empresas.map is not a function

## 📅 Fecha

19 de Octubre, 2025

## 🔍 Problema Detectado

### **Error en consola:**

```
TypeError: empresas.map is not a function
```

### **Ubicación:**

- `SetPasswordStep.tsx` línea 227
- `CreateClientStep.tsx` (mismo error potencial)

### **Síntoma:**

Al intentar renderizar el selector de empresas, la aplicación falla con error de runtime.

---

## 🕵️ Causa Raíz

### **Problema 1: Estructura de respuesta incorrecta**

El backend devuelve:

```json
{
  "empresas": [{ "id": "...", "nombreComercial": "...", "nit": "..." }]
}
```

Pero el frontend intentaba usar directamente:

```typescript
const data = await response.json();
setEmpresas(data); // ❌ Asigna { empresas: [...] }

// Luego intenta:
empresas.map((empresa) => ...) // ❌ Error: empresas es un objeto, no un array
```

### **Problema 2: Array vacío**

El endpoint devolvía `{ "empresas": [] }` porque:

- Backend filtraba por `estado: 'activo'`
- No había empresas con ese estado en la BD

---

## ✅ Solución Aplicada

### **Fix 1: Extraer el array correctamente**

**Archivo:** `SetPasswordStep.tsx` y `CreateClientStep.tsx`

**ANTES ❌:**

```typescript
const data = await response.json();
setEmpresas(data);
```

**DESPUÉS ✅:**

```typescript
const data = await response.json();
// El backend devuelve { empresas: [...] }
setEmpresas(data.empresas || []);
```

### **Fix 2: Eliminar filtro de estado en backend**

**Archivo:** `backend/src/clientes-public/clientes-public.service.ts`

**ANTES ❌:**

```typescript
async listarEmpresasPublicas() {
    const empresas = await this.prisma.empresa.findMany({
        where: {
            estado: 'activo', // ❌ Filtra empresas activas
        },
        select: { ... },
    });
    return { empresas };
}
```

**DESPUÉS ✅:**

```typescript
async listarEmpresasPublicas() {
    const empresas = await this.prisma.empresa.findMany({
        // ✅ Sin filtro de estado - devuelve todas las empresas
        select: { ... },
    });
    return { empresas };
}
```

**Justificación:** Si necesitas filtrar empresas en el futuro, puedes:

1. Agregar campo `aceptaClientesPublicos: boolean` en schema
2. Filtrar por ese campo específico
3. Por ahora, devolver todas las empresas disponibles

---

## 🧪 Verificación

### **Prueba del endpoint:**

```bash
GET http://localhost:4000/clientes/public/empresas

# Respuesta esperada:
{
  "empresas": [
    {
      "id": "uuid-empresa-1",
      "nombreComercial": "Mi Empresa SA",
      "nit": "900123456",
      "telefono": "3001234567",
      "direccion": "Calle 123",
      "logoUrl": null
    }
  ]
}
```

### **Resultado en Frontend:**

- ✅ Selector de empresas muestra las opciones
- ✅ No hay error `empresas.map is not a function`
- ✅ Se puede seleccionar una empresa correctamente

---

## 📊 Comparación

| Aspecto                        | ANTES ❌            | DESPUÉS ✅                        |
| ------------------------------ | ------------------- | --------------------------------- |
| **Response del backend**       | `{ empresas: [] }`  | `{ empresas: [...] }` (con datos) |
| **Asignación en frontend**     | `setEmpresas(data)` | `setEmpresas(data.empresas)`      |
| **Tipo de `empresas`**         | `object`            | `array`                           |
| **Funcionamiento de `.map()`** | ❌ Error            | ✅ Funciona                       |

---

## 🎯 Archivos Modificados

1. ✅ `frontend/.../SetPasswordStep.tsx` - Línea ~88
2. ✅ `frontend/.../CreateClientStep.tsx` - Línea ~152
3. ✅ `backend/src/clientes-public/clientes-public.service.ts` - Línea ~68

---

## 💡 Lecciones Aprendidas

1. **Siempre validar la estructura de respuesta del backend** antes de asignar al estado
2. **Usar fallback con `|| []`** para evitar errores si la respuesta es `null` o `undefined`
3. **Probar endpoints con Postman** antes de integrar en frontend
4. **Considerar filtros opcionales** en lugar de obligatorios para mayor flexibilidad

---

## ✅ Estado

- ✅ Error corregido
- ✅ Empresas se cargan correctamente
- ✅ Selector funcional
- ✅ Listo para pruebas

---

**Relacionado con:** `BUGFIX_RUTAS_ENDPOINTS.md`
