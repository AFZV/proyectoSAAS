import { DataTable } from "./data-table";
import { columns } from "./columns";
import { getToken } from "@/lib/getToken";
import { ProductoInventario } from "./columns";
import { Package } from "lucide-react";

export async function getInventario(): Promise<ProductoInventario[]> {
  const token = await getToken();
  if (!token) return [];

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/inventario/productosall`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.productos || [];
}

export default async function ListInventariosPage() {
  const data = await getInventario();

  return (
    <section className="min-h-screen px-4 py-6 bg-background text-foreground">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Inventario de Productos</h1>
          <p className="text-sm text-muted-foreground">
            Lista de productos y stock de referencia
          </p>
        </header>
        <div className="bg-card rounded-lg border">
          <div className="p-6">
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
              ¡Comienza a gestionar tu inventario!
            </h3>
            <p className="text-blue-700 dark:text-blue-300 mb-4">
              Registra tu primer movimiento de inventario para comenzar a llevar el control de tu inventario.
            </p>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              💡 <strong>Tip:</strong> Los movimientos de inventario se sincronizan automáticamente
            </div>
          </div>
        )}
      </div>
    </section>
  );
}