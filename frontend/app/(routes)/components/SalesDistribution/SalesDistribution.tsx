import { CustomIcon } from "@/components/CustomIcon";
import { BarChart, TrendingUp } from "lucide-react";
import { GraphicsVentas } from "../Graphics";
import { GraphicsRecaudos } from "../GraphicsRecaudos";
import { getToken } from "@/lib/getToken";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function SalesDistribution() {
  const token = await getToken();

  // Fetch ventas
  const resventas = await fetch(`${BACKEND_URL}/dashboard/ventas`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });
  const dataVentas = await resventas.json();
  console.log("Respuesta de ventas:", dataVentas);

  // Fetch cobros
  const resCobros = await fetch(`${BACKEND_URL}/dashboard/cobros`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });
  const dataCobros = await resCobros.json();
  console.log("Respuesta de cobros:", dataCobros);

  return (
    <div className="space-y-4">
      {/* Gráfico de Ventas - ✅ className corregido */}
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BarChart
                className="h-4 w-4 text-blue-600 dark:text-blue-400"
                strokeWidth={1.5}
              />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                Distribución de Ventas
              </h3>
              <p className="text-xs text-muted-foreground">
                Evolución mensual de ventas
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
            <TrendingUp className="h-3 w-3" />
            <span>+12.5%</span>
          </div>
        </div>

        {/* ✅ Altura fija más pequeña y controlada */}
        <div className="h-[240px] w-full">
          <GraphicsVentas data={dataVentas} />
        </div>
      </div>

      {/* Gráfico de Cobros - ✅ className corregido */}
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <BarChart
                className="h-4 w-4 text-green-600 dark:text-green-400"
                strokeWidth={1.5}
              />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                Distribución de Cobros
              </h3>
              <p className="text-xs text-muted-foreground">
                Recaudos mensuales realizados
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
            <TrendingUp className="h-3 w-3" />
            <span>+8.3%</span>
          </div>
        </div>

        {/* ✅ Altura fija más pequeña y controlada */}
        <div className="h-[240px] w-full">
          <GraphicsRecaudos data={dataCobros} />
        </div>
      </div>
    </div>
  );
}
