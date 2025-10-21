import React from "react";
import { HeaderVencimientosClientes } from "./HeaderVencimientos";
import { ListClientsVencimientosPage } from "./ListVencimientos";
import { getToken } from "@/lib/getToken";

type StatsProps = {
  vencidos: number;
  vencenHoy: number;
  vencen7Dias: number;
  totalPorCobrar: number;
};
export default async function VencimientosPage() {
  const stats: StatsProps = {
    vencidos: 0,
    vencenHoy: 0,
    vencen7Dias: 0,
    totalPorCobrar: 0,
  };

  const token = await getToken();
  if (!token) {
    return (
      <div className="p-6">
        <p className="text-red-600">
          Por favor, inicia sesión para ver los vencimientos.
        </p>
      </div>
    );
  }
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/balance/resumenVencimientos`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    if (res.ok) {
      const data = await res.json();
      stats.vencidos = data.vencidos || 0;
      stats.vencenHoy = data.vencenHoy || 0;
      stats.vencen7Dias = data.vencen7Dias || 0;
      stats.totalPorCobrar = data.totalPorCobrar || 0;
      console.log("Fetched stats:", stats);
    } else {
      console.error("Error fetching stats:", res.status, res.statusText);
    }
  } catch (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">
          No se pudo conectar al servidor. Por favor, intenta de nuevo más
          tarde.
        </p>
      </div>
    );
  }

  return (
    <>
      <HeaderVencimientosClientes stats={stats} />
      <div>
        <ListClientsVencimientosPage />
      </div>
    </>
  );
}
