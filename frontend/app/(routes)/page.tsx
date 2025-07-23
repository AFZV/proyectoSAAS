import { CardSummary } from "./components/CardSummary";
import {
  DollarSign,
  UserRound,
  BookCheck,
  TrendingUp,
  Calendar,
  Activity,
  Target,
} from "lucide-react";
import { SalesDistribution } from "./components/SalesDistribution";
import { LastOrders } from "./components/LastOrders";
import { formatValue } from "@/utils/FormartValue";
import { Loading } from "@/components/Loading";
import { getToken } from "@/lib/getToken";
import NoDisponible from "@/components/NoDisponible/NoDisponible";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default async function Home() {
  const token = await getToken();

  const res = await fetch(`${BACKEND_URL}/dashboard/summary`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("Error al obtener datos del backend", res);
    return <NoDisponible />;
  }

  const data = await res.json();

  if (!data) {
    return <Loading title="Cargando datos..." />;
  }

  // Formatear los valores numéricos para mostrar en las tarjetas
  const totalCobrosFormat = formatValue(data.totalValorRecibos);
  const totalVentasFormat = formatValue(data.totalVentas);

  //Funcion para formatear porcentajes
  const formatTrend = (percentaje: number) => {
    const num = Number(percentaje) || 0;
    const rounded = Math.round(num * 10) / 10;
    const sign = rounded >= 0 ? "+" : "-";

    // Usamos Math.abs para no duplicar el signo
    const formatted = Math.abs(rounded).toLocaleString("es-CO", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });

    return `${sign}${formatted}%`;
  };

  const gretTrendColor = (percentaje: number) => {
    return percentaje >= 0 ? "green" : "red";
  };

  return (
    <div className="space-y-6">
      {/* 🎯 Header - EXACTAMENTE como lo tenías */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-2xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl lg:text-3xl font-bold">
              ¡Bienvenido, {data.usuario.nombre}! 👋
            </h1>
            <p className="text-blue-100 text-sm lg:text-base">
              {data.empresa.nombreComercial} • NIT: {data.empresa.nit} •{" "}
              {data.usuario.rol}
            </p>
          </div>
          <div className="mt-3 lg:mt-0 flex items-center space-x-2 text-blue-100 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">
              {new Date().toLocaleDateString("es-ES", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* ✅ Métricas - TU CardSummary ORIGINAL con SOLO datos del backend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardSummary
          icon={UserRound}
          total={String(data.totalClientes)}
          title="Total Clientes"
          subtitle="Activos en la Plataforma"
        />
        <CardSummary
          icon={DollarSign}
          total={String(totalCobrosFormat)}
          title="Cobros Hoy"
          subtitle="Recaudados en el Día"
          trend={formatTrend(
            data.variaciones?.variacionPorcentualCobros || "0"
          )}
          trendColor={gretTrendColor(
            data.variaciones?.variacionPorcentualCobros || 0
          )}
        />
        <CardSummary
          icon={BookCheck}
          total={String(totalVentasFormat)}
          title="Ventas Hoy"
          subtitle="Facturado en el Día"
          trend={formatTrend(
            data.variaciones?.variacionPorcentualVentas || "0"
          )}
          trendColor={gretTrendColor(
            data.variaciones?.variacionPorcentualVentas || 0
          )}
        />
        <CardSummary
          icon={TrendingUp}
          total={String(data.operacionesActual || 0)}
          title="Transacciones"
          subtitle="Operaciones completadas"
          trend={formatTrend(
            data.variaciones?.variacionPorcentualPedidos || "0"
          )}
          trendColor={gretTrendColor(
            data.variaciones?.variacionPorcentualPedidos || 0
          )}
        />
      </div>

      {/* Layout Principal - EXACTAMENTE como lo tenías */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Gráficas - 3 columnas en desktop */}
        <div className="lg:col-span-3">
          <SalesDistribution />
        </div>

        {/* Panel Lateral - 1 columna en desktop */}
        <div className="lg:col-span-1 space-y-4">
          {/* ✅ Últimos Pedidos - SOLO agregar datos del backend */}
          <LastOrders pedidos={data.ultimosPedidos || []} />

          {/* Widget de Rendimiento - EXACTAMENTE como lo tenías */}
          <div className="bg-card border rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-sm">Meta Mensual</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Progreso</span>
                <span className="text-sm font-medium text-green-600">68%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                  style={{ width: "68%" }}
                ></div>
              </div>
              <div className="text-xs text-muted-foreground">
                $1.8M de $2.6M objetivo
              </div>
            </div>
          </div>

          {/* Widget de Actividad - EXACTAMENTE como lo tenías */}
          <div className="bg-card border rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-sm">Actividad Reciente</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground">
                    Nuevo cliente registrado
                  </p>
                  <p className="text-xs text-muted-foreground">Hace 2 min</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground">Pago procesado</p>
                  <p className="text-xs text-muted-foreground">Hace 5 min</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground">Pedido completado</p>
                  <p className="text-xs text-muted-foreground">Hace 12 min</p>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones Rápidas - EXACTAMENTE como las tenías */}
          <div className="bg-card border rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-3">Acciones Rápidas</h3>
            <div className="space-y-2">
              <button className="w-full p-2 text-left rounded-lg border hover:bg-muted/50 transition-colors group flex items-center space-x-2">
                <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                  <UserRound className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs font-medium">Nuevo Cliente</span>
              </button>

              <button className="w-full p-2 text-left rounded-lg border hover:bg-muted/50 transition-colors group flex items-center space-x-2">
                <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded">
                  <DollarSign className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-xs font-medium">Nuevo Recaudo</span>
              </button>

              <button className="w-full p-2 text-left rounded-lg border hover:bg-muted/50 transition-colors group flex items-center space-x-2">
                <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded">
                  <BookCheck className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-xs font-medium">Nueva Venta</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
