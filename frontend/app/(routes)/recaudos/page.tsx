// app/recaudos/page.tsx
import NoDisponible from "@/components/NoDisponible/NoDisponible";
import { getToken } from "@/lib/getToken";

// Componentes del módulo Recaudos
import { HeaderRecaudos } from "./(components)/HeaderRecaudos/HeaderRecaudos";
import { StatCard } from "./(components)/HeaderRecaudos/StateCard";
import { ListRecaudos } from "./(components)/ListRecaudos";

/* --------------------------- Tipos locales --------------------------- */
type StatsApi = {
  totalRecibos: number | string;
  totalRecaudado: number | string;
  totalPorRecaudar: number | string;
  [k: string]: any; // el backend envía debug u otros campos
};

/* --------------------------- Utilidades --------------------------- */
function toNumber(n: number | string | undefined | null): number {
  if (typeof n === "number") return n;
  if (typeof n === "string") {
    const cleaned = n.replace(/[^\d.-]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatCOP(value: number): string {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/* ------------------------------------------------------------------ */
/*                          Server Component                          */
/* ------------------------------------------------------------------ */
export default async function RecaudosPage() {
  const token = await getToken();
  if (!token) return <NoDisponible />;

  /* ----- Fetch en paralelo ----- */
  const [userRes, dataRes, statsRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/usuario-actual`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/recibos/all`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/recibos/getStats/summary`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
  ]);

  /* ----- Validaciones ----- */
  if (!userRes.ok) return <NoDisponible />;

  const usuario = await userRes.json();
  const rol: string = usuario?.rol ?? "user";

  const data = (await dataRes.json()) ?? [];

  const rawStats: StatsApi = await statsRes.json();
  // Hay backend que devuelve stats bajo otra clave (ej: rawStats.data o rawStats.debugPedidos)
  // Si tu endpoint ya entrega el shape directo, ignora esto.
  const statsObj = {
    totalRecibos: toNumber(
      rawStats.totalRecibos ?? rawStats?.data?.totalRecibos
    ),
    totalRecaudado: toNumber(
      rawStats.totalRecaudado ?? rawStats?.data?.totalRecaudado
    ),
    totalPorRecaudar: toNumber(
      rawStats.totalPorRecaudar ?? rawStats?.data?.totalPorRecaudar
    ),
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-6 space-y-6">
      {/* Header estilo Reportes, sin tarjetas */}
      <HeaderRecaudos rol={rol} />

      {/* Tarjetas de estadísticas fuera del header */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Recibos"
          value={statsObj.totalRecibos}
          description="Recibos registrados"
          color="blue"
        />
        <StatCard
          title="Total Recaudado"
          value={formatCOP(statsObj.totalRecaudado)}
          description="Ingresos por recibos"
          color="green"
        />
        <StatCard
          title="Pendiente por recaudar"
          value={formatCOP(statsObj.totalPorRecaudar)}
          description="Total pendiente"
          color="yellow"
        />
      </div>

      {/* Lista de recibos */}
      <ListRecaudos data={data} />
    </div>
  );
}
