import { Users } from "lucide-react";
import { Cliente, TableClients } from "./table";

export function InactiveClients({ clientes }: { clientes: Cliente[] }) {
  return (
    <section className="min-h-screen bg-background text-foreground px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-card rounded-lg border">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground text-center">
                Lista de clientes sin pedidos por mas de 90 dias
              </h2>
              {clientes.length === 0 && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="w-4 h-4 mr-2" />
                  <span>No hay clientes registrados</span>
                </div>
              )}
            </div>
            <TableClients clientes={clientes} />
          </div>
        </div>
      </div>
    </section>
  );
}
