import { getToken } from "@/lib/getToken";
import { Building2 } from "lucide-react";
import { columns, ProveedorConSaldo } from "./columns";
import { DataTable } from "./data-table";

/**
 * Estrategia:
 * 1) Intentar endpoint directo de agregados: /proveedores/saldos
 *    Estructura esperada: [{ idProveedor, nombre, nit, ciudad, telefono, email, saldoPendiente }]
 * 2) Fallback:
 *    - GET /proveedores
 *    - Para cada proveedor: GET /facturas-proveedor?proveedorId=...
 *      Sumar campo `saldo` (que tu servicio mantiene) sólo en estados no anulados
 */
export async function getProveedoresConSaldo(): Promise<ProveedorConSaldo[]> {
  const token = await getToken();
  if (!token) return [];

  const API = process.env.NEXT_PUBLIC_API_URL;

  // 1) Intento directo

  const res = await fetch(`${API}/facturas-proveedor/saldos/proveedores`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.ok) {
    const data: ProveedorConSaldo[] = await res.json();
    console.log("data que llega :", data);
    return data;
  }
  return [];
}

export async function ListProvidersPage() {
  const data = await getProveedoresConSaldo();
  console.log("data que llega a list providers :", data);

  return (
    <section className=" bg-background text-foreground px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-card rounded-lg border">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Proveedores y saldos
              </h2>
              {data.length === 0 && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Building2 className="w-4 h-4 mr-2" />
                  <span>No hay proveedores o no se pudo calcular el saldo</span>
                </div>
              )}
            </div>
            <DataTable columns={columns} data={data} />
          </div>
        </div>

        {data.length === 0 && (
          <div className="mt-6 text-center p-8 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Aún no hay saldos por pagar
            </h3>
            <p className="text-blue-700 dark:text-blue-300 mb-2">
              Crea facturas de proveedor o vincula compras para ver saldos
              pendientes.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
