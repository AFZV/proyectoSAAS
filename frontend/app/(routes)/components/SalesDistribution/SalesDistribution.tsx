import { CustomIcon } from "@/components/CustomIcon";
import { BarChart } from "lucide-react";
import { GraphicsVentas } from "../Graphics";
import { GraphicsRecaudos } from "../GraphicsRecaudos";
import { auth } from "@clerk/nextjs";
import { headers } from "next/headers";
import { getToken } from "@/lib/getToken";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
export async function SalesDistribution() {
  const token = await getToken();
  //fetch ventas
  const resventas = await fetch(`${BACKEND_URL}/dashboard/ventas`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },

    next: { revalidate: 0 },
  });
  const dataVentas = await resventas.json();

  console.log("esto me llega de ventas del back:", dataVentas);
  //fetch cobros
  const resCobros = await fetch(`${BACKEND_URL}/dashboard/cobros`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    next: { revalidate: 0 }, // no cache
  });
  const dataCobros = await resCobros.json();
  console.log("esto me llega de cobros del back:", dataCobros);
  // terminan los fetch
  return (
    <div className="shadow-sm bg-background rounded-lg p-5">
      <div className="flex gap-x-2 items-center">
        <CustomIcon icon={BarChart} />
        <p className="text-xl">Distribución de Ventas</p>
      </div>
      <GraphicsVentas data={dataVentas} />
      <div className="flex gap-x-2 items-center pt-3">
        <CustomIcon icon={BarChart} />
        <p className="text-xl">Distribución de Cobros</p>
      </div>
      <GraphicsRecaudos data={dataCobros} />
    </div>
  );
}
