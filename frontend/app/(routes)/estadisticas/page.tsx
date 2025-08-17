import React from "react";
import { CarrouselProducts } from "./components/CarrouselProducts";
import { getToken } from "@/lib/getToken";
import { InactiveClients } from "./components/InactiveClients/InactiveClients";
import { HeaderEstadisticas } from "./components/HeaderEstadisticas";

export default async function EstadisticasPage() {
  const token = await getToken();

  const stats = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/estadisticas/stats`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-cache",
    }
  );

  if (!stats.ok) return "NO TIENE ACCESO";
  const resultStats = await stats.json();

  return (
    <div className="flex flex-col space-y-4 px-5">
      <HeaderEstadisticas />
      <div className="flex flex-col md:flex-row justify-center items-start md:items-center gap-8">
        <CarrouselProducts
          productos={resultStats.ProductsLowStock}
          titulo="Productos con poco stock"
        />
        <CarrouselProducts
          productos={resultStats.productos}
          titulo="Productos con tación"
        />
      </div>

      <div>
        <InactiveClients clientes={resultStats.clientes} />
      </div>
    </div>
  );
}
