import { Usuario, columns } from "./columns";
import { DataTable } from "./data-table";
import { getToken } from "@/lib/getToken";
import { Users } from "lucide-react";

export async function getUsuarios(): Promise<Usuario[]> {
  try {
    const token = await getToken();

    if (!token) {
      console.error("No hay token de autenticación");
      return [];
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/usuario/obtener/all`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store", // Evita cache para datos actualizados
      }
    );

    if (!res.ok) {
      console.error("Error al obtener clientes:", res.status, res.statusText);
      return [];
    }

    const data = await res.json();
    return data || [];
  } catch (error) {
    console.error("Error en getClientes:", error);
    return [];
  }
}

export default async function ListUsuariosPage() {
  const data = await getUsuarios();
  console.log("clientes que llegan al front:", data);
  return (
    <section className="min-h-screen bg-background text-foreground px-4 py-6">
      <div className="max-w-6xl mx-auto">
        {/* Estadísticas rápidas - Siempre visible (Solo 3 tarjetas) */}

        {/* Tabla de datos - SIEMPRE VISIBLE */}
        <div className="bg-card rounded-lg border">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Lista de Usuarios
              </h2>
              {data.length === 0 && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="w-4 h-4 mr-2" />
                  <span>No hay Usuarios registrados</span>
                </div>
              )}
            </div>
            <DataTable columns={columns} data={data} />
          </div>
        </div>

        {/* Mensaje de ayuda cuando no hay Usuarios */}
        {data.length === 0 && (
          <div className="mt-6 text-center p-8 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              ¡Comienza a gestionar tus Usuarios!
            </h3>
            <p className="text-blue-700 dark:text-blue-300 mb-4">
              Crea tu primer Empresa usando el botón Crear Usuarios en la parte
              superior.
            </p>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              💡 <strong>Tip:</strong> También puedes usar Actualizar Usuarios
              para probar la búsqueda (puedes buscar cualquier correo para ver
              cómo funciona)
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
