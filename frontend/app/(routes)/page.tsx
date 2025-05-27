import { CardSummary } from "./components/CardSummary";
import { DollarSign, UserRound, BookCheck } from "lucide-react";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import NoDisponible from "@/components/NoDisponible/NoDisponible";
import { SalesDistribution } from "./components/SalesDistribution";
import { formatValue } from "@/utils/FormartValue";
import { Loading } from "@/components/Loading";

// Reemplaza con tu URL real
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default async function Home() {
  const { userId } = auth();

  if (!userId) {
    redirect("/noAutorizado");
  }

  //fetch dashboard
  const res = await fetch(`${BACKEND_URL}/dashboard/summary?userId=${userId}`, {
    next: { revalidate: 0 }, // no cache
  });

  if (!res.ok) {
    console.error("Error al obtener datos del backend");
    return <NoDisponible />;
  }

  const data = await res.json();

  if (!data?.usuario || !data?.empresa) {
    return <Loading title="Cargando datos..." />;
  }

  const totalCobrosFormat = formatValue(data.totalRecibos);
  const totalVentasFormat = formatValue(data.totalVentas);

  return (
    <div>
      <div className="max-w-3xl mx-auto mb-8 p-6 bg-white shadow-md rounded-2xl border border-gray-200 text-center space-y-2">
        <h2 className="text-lg font-semibold text-gray-700">
          <span className="text-muted-foreground"> NIT:</span>{" "}
          {data.empresa.nit}
        </h2>
        <h2 className="text-lg font-semibold text-gray-700">
          <span className="text-muted-foreground">Nombre Comercial:</span>{" "}
          {data.empresa.nombreComercial}
        </h2>
        <h2 className="text-lg font-semibold text-gray-700">
          <span className="text-muted-foreground">Teléfono:</span>{" "}
          {data.empresa.telefono}
        </h2>
        <h2 className="text-lg font-semibold text-gray-700">
          <span className="text-muted-foreground">Usuario:</span>{" "}
          {data.usuario.nombres}
        </h2>
        <h2 className="text-lg font-semibold text-gray-700">
          <span className="text-muted-foreground">Rol del Usuario:</span>{" "}
          {data.usuario.rol}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-x-20">
        <CardSummary
          icon={UserRound}
          total={String(data.totalClientes)}
          title="Total Clientes"
        />
        <CardSummary
          icon={DollarSign}
          total={String(totalCobrosFormat)}
          title="Total Cobros hoy"
        />
        <CardSummary
          icon={BookCheck}
          total={String(totalVentasFormat)}
          title="Ventas Hoy"
        />
      </div>

      <div className="grid grid-cols-1 mt-12">
        <SalesDistribution />
      </div>
    </div>
  );
}
