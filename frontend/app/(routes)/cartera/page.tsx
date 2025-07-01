import React from "react";
import { CarteraStats, HeaderCartera } from "./components/HeaderCartera";

export default function CarteraPage() {
  const stats: CarteraStats = {
    totalSaldo: 1,
    totalPositivos: 2,
    totalNegativos: 3,
  };
  return (
    <div>
      <HeaderCartera rol="admin" stats={stats} />
    </div>
  );
}
