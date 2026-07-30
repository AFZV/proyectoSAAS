import { getToken } from "@/lib/getToken";
import { listarOrdenesCompra } from "../../services/ordenes-compra.service";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import { ClipboardList } from "lucide-react";

export async function ListOrdenesCompra() {
  const token = await getToken();
  const ordenes = token ? await listarOrdenesCompra(token) : [];

  return (
    <section className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-card rounded-lg border">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Órdenes de Compra</h2>
              {ordenes.length === 0 && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  <span>No hay órdenes registradas</span>
                </div>
              )}
            </div>
            <DataTable columns={columns} data={ordenes} />
          </div>
        </div>
      </div>
    </section>
  );
}
