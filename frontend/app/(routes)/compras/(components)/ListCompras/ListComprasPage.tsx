import { Compra, columns } from "./columns";
import { DataTable } from "./data-table";
import { getToken } from "@/lib/getToken";
import { AlertCircle, ShoppingCart, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Función para obtener compras
export async function getCompras(): Promise<Compra[]> {
  try {
    const token = await getToken();
    if (!token) {
      console.error("No hay token de autenticación");
      return [];
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compras/findAll/empresa`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Error al obtener compras:", res.status, res.statusText);
      return [];
    }

    const data = await res.json();
    console.log("Datos de compras recibidos:", data);
    return data.compras || data || [];
  } catch (error) {
    console.error("Error en getCompras:", error);
    return [];
  }
}

// Componente principal
export default async function ListComprasPage() {
  const data = await getCompras();
  console.log("compras que llegan al front:", data);

  return (
    <section className="min-h-screen bg-background text-foreground px-4 py-6">
      <div className="max-w-6xl mx-auto">
        {/* Encabezado */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Gestión de Compras</h1>
              <p className="text-muted-foreground">Administra y consulta todas las compras realizadas</p>
            </div>
            {/* Botón Nueva Compra */}
            <Link href="/compras/nueva">
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nueva Compra
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabla de datos */}
        <div className="bg-card rounded-lg border">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Lista de Compras
              </h2>
              {data.length === 0 && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  <span>No hay compras registradas</span>
                </div>
              )}
            </div>
            <DataTable columns={columns} data={data} />
          </div>
        </div>

        {/* Mensaje de ayuda cuando no hay compras */}
        {data.length === 0 && (
          <div className="mt-6 text-center p-8 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              ¡Comienza a gestionar tus compras!
            </h3>
            <p className="text-blue-700 dark:text-blue-300 mb-4">
              Registra tu primera compra para comenzar a llevar el control de tu inventario.
            </p>
            <div className="text-sm text-blue-600 dark:text-blue-400 mb-4">
              💡 <strong>Tip:</strong> Las compras se sincronizan automáticamente con tu inventario
            </div>
            <Link href="/compras/nueva">
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Crear Primera Compra
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}