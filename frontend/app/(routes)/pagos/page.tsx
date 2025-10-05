import React from "react";
import { HeaderPagos } from "./components/HeaderPagos";
import { ListProvidersPage } from "./components/ListPagos";
import { getToken } from "@/lib/getToken";
import ListVencimientosPage from "./components/ListPagos/ListVencimientos";

type StatsProps = {
  vencimientosProximos: number;
  totalPorPagar: {
    deudaUsd: number;
    deudaCop: number;
    deudaYuan: number;
  } | null;
};

export default async function PagosPage() {
  const stats: StatsProps = {
    vencimientosProximos: 0,
    totalPorPagar: {
      deudaUsd: 0,
      deudaCop: 0,
      deudaYuan: 0,
    },
  };
  const token = await getToken();
  if (token) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/facturas-proveedor/stats/resumen`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );
    if (res.ok) {
      const data = await res.json();
      stats.vencimientosProximos = data.vencimientosProximos || 0;
      stats.totalPorPagar = data.totalPorPagar || {
        deudaUsd: 0,
        deudaCop: 0,
        deudaYuan: 0,
      };
    }
    return (
      <>
        <HeaderPagos stats={stats} />
        <div>
          <ListProvidersPage />
        </div>
        <div>
          <ListVencimientosPage />
        </div>
      </>
    );
  }
}
