import { CardSummary } from "./components/CardSummary";
import { DollarSign, UserRound, BookCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { auth } from "@clerk/nextjs/server";
import NoDisponible from "@/components/NoDisponible/NoDisponible";
import { SalesDistribution } from "./components/SalesDistribution";
import { formatValue } from "@/utils/FormartValue";
import { Loading } from "@/components/Loading";
import { getToken } from "@/lib/getToken";

// URL del backend NestJS
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
  console.log("esto hay en data:", data);

  if (!data) {
    return <Loading title="Cargando datos..." />;
  }
  console.log("token en front verificado en backend:", token);
  const totalCobrosFormat = formatValue(data.totalRecibos);
  const totalVentasFormat = formatValue(data.totalVentas);

  return (
    <div>
      <div className="max-w-3xl mx-auto mb-8 p-6 bg-card text-card-foreground shadow-md rounded-2xl border text-center space-y-2">
        <h2 className="text-lg font-semibold">
          <span className="text-muted-foreground">NIT:</span> {data.empresa.nit}
        </h2>
        <h2 className="text-lg font-semibold">
          <span className="text-muted-foreground">Nombre Comercial:</span>{" "}
          {data.empresa.nombreComercial}
        </h2>
        <h2 className="text-lg font-semibold">
          <span className="text-muted-foreground">Teléfono:</span>{" "}
          {data.empresa.telefono}
        </h2>
        <h2 className="text-lg font-semibold">
          <span className="text-muted-foreground">Usuario:</span>{" "}
          {data.usuario.nombre}
        </h2>
        <h2 className="text-lg font-semibold">
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
