import { CustomIcon } from "@/components/CustomIcon";
import { BarChart, TrendingUp, TrendingDown } from "lucide-react";
import { GraphicsVentas } from "../Graphics";
import { GraphicsRecaudos } from "../GraphicsRecaudos";
import { getToken } from "@/lib/getToken";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type SalesDistributionProps = {
  variacionVentas?: number | string;
  variacionCobros?: number | string;
};

export async function SalesDistribution({
  variacionVentas,
  variacionCobros,
}: SalesDistributionProps) {
  const token = await getToken();

  const resventas = await fetch(`${BACKEND_URL}/dashboard/ventas`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });
  const dataVentas = await resventas.json();

  const resCobros = await fetch(`${BACKEND_URL}/dashboard/cobros`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });
  const dataCobros = await resCobros.json();

  // 👉 Función auxiliar para decidir icono/color
  const renderVariacion = (valor?: number | string) => {
    if (valor === undefined || valor === null) return null;

    // Normalizar a número (soporta " -54.6% ", "-54.6", 0, 12.3, etc.)
    const n =
      typeof valor === "number"
        ? valor
        : parseFloat(String(valor).replace("%", "").trim());

    if (Number.isNaN(n)) return null;

    const esNegativo = n < 0;
    const esCero = n === 0;

    // Icono y color según signo (comportamiento natural)
    const Icono = esNegativo ? TrendingDown : TrendingUp;
    const colorClass = esNegativo
      ? "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20"
      : esCero
      ? "text-muted-foreground bg-muted/30 dark:bg-muted/10"
      : "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20";

    // Formatear porcentaje mostrado
    const mostrar = `${n.toFixed(2)}%`;

    return (
      <div
        className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${colorClass}`}
      >
        <Icono className="h-3 w-3" />
        <span>{mostrar}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Gráfico de Ventas */}
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

          {renderVariacion(variacionVentas)}
        </div>

        <div className="h-[240px] w-full">
          <GraphicsVentas data={dataVentas} />
        </div>
      </div>

      {/* Gráfico de Cobros */}
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

          {renderVariacion(variacionCobros)}
        </div>

        <div className="h-[240px] w-full">
          <GraphicsRecaudos data={dataCobros} />
        </div>
      </div>
    </div>
  );
}
