import React from "react";
import { HeaderPagos } from "./components/HeaderPagos";

export default function PagosPage() {
  const stats = {
    vencimientosProximos: 5,
    totalPorPagar: 1500,
  };
  return <HeaderPagos stats={stats} />;
}
