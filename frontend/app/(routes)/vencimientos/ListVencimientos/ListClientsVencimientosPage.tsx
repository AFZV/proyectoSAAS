import { getToken } from "@/lib/getToken";
import { columns, ClienteConSaldo } from "./columns"; // crea columnas similares a proveedores
import { DataTableClients } from "./data-table";
import { Users2, WalletMinimal, AlertCircle } from "lucide-react";

/**
 * Estrategia (CxC Clientes):
 * 1) Intentar endpoint directo de agregados: GET /facturas-clientes/saldos/clientes
 *    Estructura esperada: [{ idCliente, nombre, identificacion, ciudad, telefono, email, saldoPendiente }]
 * 2) Fallback (si aún no tienes el agregado):
 *    - GET /clientes
 *    - Para cada cliente: GET /facturas-cliente?clienteId=...
 *      Sumar el campo `saldo` únicamente para facturas vigentes/no anuladas.
 */

export async function getClientesConSaldo(): Promise<ClienteConSaldo[]> {
  const token = await getToken();
  if (!token) return [];

  const API = process.env.NEXT_PUBLIC_API_URL;

  // 1) Intento directo
  const res = await fetch(`${API}/balance/saldos-por-cliente`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (res.ok) {
    const data: ClienteConSaldo[] = await res.json();
    return data;
  }

  // 2) Fallback suave (opcional): devolver lista vacía para UI predecible
  return [];
}

const fmtCOP = (v: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v || 0);

export async function ListClientsVencimientosPage() {
  const data = await getClientesConSaldo();

  const totalClientes = data.length;

  // const totalSaldoCOP = data.reduce(
  //   (acc, c) => acc + (c.saldoPendienteCOP || 0),
  //   0
  // );

  return (
    <section className="bg-background text-foreground px-4 py-6">
      <div className="max-w-6xl mx-auto">
        {/* Encabezado con KPIs */}

        {/* Tabla */}
        <div className="bg-card rounded-lg border">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Clientes y saldos acumulados
              </h2>
              {data.length === 0 && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users2 className="w-4 h-4 mr-2" />
                  <span>No hay clientes con saldo o no se pudo calcular</span>
                </div>
              )}
            </div>

            <DataTableClients
              searchColumnId="buscar"
              searchPlaceholder="Buscar por razón social, NIT, nombre, apellidos, email…"
              columns={columns}
              data={data}
            />
          </div>
        </div>

        {data.length === 0 && (
          <div className="mt-6 text-center p-8 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users2 className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-2">
              Aún no hay saldos por cobrar
            </h3>
          </div>
        )}
      </div>
    </section>
  );
}
