"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { BarChart, TrendingUp, TrendingDown } from "lucide-react";
import { GraphicsVentas } from "../Graphics";
import { GraphicsRecaudos } from "../GraphicsRecaudos";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

const currentYear = new Date().getFullYear();
const YEARS = Array.from(
  { length: currentYear - 2022 },
  (_, i) => 2023 + i
).reverse(); // más reciente primero

type VentasMes = { Mes: string; ventas: number };
type CobrosMes = { Mes: string; cobros: number };

type Props = {
  variacionVentas?: number | string;
  variacionCobros?: number | string;
};

function VariacionBadge({ valor }: { valor?: number | string }) {
  if (valor === undefined || valor === null) return null;
  const n =
    typeof valor === "number"
      ? valor
      : parseFloat(String(valor).replace("%", "").trim());
  if (Number.isNaN(n)) return null;
  const neg = n < 0;
  const Icono = neg ? TrendingDown : TrendingUp;
  return (
    <div
      className={cn(
        "flex items-center gap-1 text-xs px-2 py-1 rounded-full",
        neg
          ? "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20"
          : n === 0
          ? "text-muted-foreground bg-muted/30"
          : "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20"
      )}
    >
      <Icono className="h-3 w-3" />
      <span>{n.toFixed(2)}%</span>
    </div>
  );
}

function YearSelector({
  year,
  onChange,
}: {
  year: number;
  onChange: (y: number) => void;
}) {
  return (
    <select
      value={year}
      onChange={(e) => onChange(Number(e.target.value))}
      className="text-xs border border-border rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
    >
      {YEARS.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}

export function SalesDistribution({ variacionVentas, variacionCobros }: Props) {
  const { getToken } = useAuth();
  const [year, setYear] = useState(currentYear);
  const [dataVentas, setDataVentas] = useState<VentasMes[]>([]);
  const [dataCobros, setDataCobros] = useState<CobrosMes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [rv, rc] = await Promise.all([
          fetch(`${API}/dashboard/ventas?year=${year}`, { headers }),
          fetch(`${API}/dashboard/cobros?year=${year}`, { headers }),
        ]);
        if (!cancelled) {
          setDataVentas(rv.ok ? await rv.json() : []);
          setDataCobros(rc.ok ? await rc.json() : []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  return (
    <div className="space-y-4">
      {/* Gráfico de Ventas */}
      <div className="bg-card border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BarChart className="h-4 w-4 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                Distribución de Ventas
              </h3>
              <p className="text-xs text-muted-foreground">
                Evolución mensual · {year}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <YearSelector year={year} onChange={setYear} />
            <VariacionBadge valor={variacionVentas} />
          </div>
        </div>
        <div className={cn("h-[240px] w-full transition-opacity", loading && "opacity-40 pointer-events-none")}>
          <GraphicsVentas data={dataVentas} />
        </div>
      </div>

      {/* Gráfico de Cobros */}
      <div className="bg-card border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <BarChart className="h-4 w-4 text-green-600 dark:text-green-400" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                Distribución de Cobros
              </h3>
              <p className="text-xs text-muted-foreground">
                Recaudos mensuales · {year}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <YearSelector year={year} onChange={setYear} />
            <VariacionBadge valor={variacionCobros} />
          </div>
        </div>
        <div className={cn("h-[240px] w-full transition-opacity", loading && "opacity-40 pointer-events-none")}>
          <GraphicsRecaudos data={dataCobros} />
        </div>
      </div>
    </div>
  );
}
