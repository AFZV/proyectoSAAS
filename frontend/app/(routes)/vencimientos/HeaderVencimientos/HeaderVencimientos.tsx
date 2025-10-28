// app/(routes)/cobros/(components)/HeaderVencimientosClientes/HeaderVencimientosClientes.tsx
"use client";

import React from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  PiggyBank,
  Receipt,
  WalletMinimal,
} from "lucide-react";

export type HeaderVencimientosClientesProps = {
  stats: {
    vencidos: number;
    vencenHoy: number;
  };
};

export function HeaderVencimientosClientes({
  stats,
}: HeaderVencimientosClientesProps) {
  const { vencidos, vencenHoy } = stats;

  const fmtCOP = (v: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v || 0);

  return (
    <div className="relative mx-6 overflow-hidden rounded-3xl shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600" />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 10%, white 1px, transparent 1px), radial-gradient(circle at 80% 30%, white 1px, transparent 1px), radial-gradient(circle at 50% 80%, white 1px, transparent 1px)",
          backgroundSize: "24px 24px, 30px 30px, 26px 26px",
        }}
      />

      <div className="relative p-6 lg:p-7 text-white">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-inner">
            <PiggyBank className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
              ESTADO DE VENCIMIENTOS
            </h1>
            <p className="text-white/80 text-sm">
              Seguimiento general de facturas por cobrar
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
            <div className="text-xs text-white/80 font-medium mb-1 flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Facturas vencidas
            </div>
            <div className="text-3xl font-extrabold text-yellow-300">
              {Number(vencidos || 0).toLocaleString("es-CO")}
            </div>
            {Number(vencidos || 0) > 0 && (
              <div className="mt-2 text-xs text-yellow-200 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Requieren acción inmediata
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
            <div className="text-xs text-white/80 font-medium mb-1 flex items-center gap-2">
              <CalendarClock className="w-4 h-4" />
              Vencen hoy
            </div>
            <div className="text-3xl font-extrabold text-white">
              {Number(vencenHoy || 0).toLocaleString("es-CO")}
            </div>
            <div className="mt-2 text-[11px] text-white/70 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Prioriza recordatorios y seguimiento
            </div>
          </div>
          <div className="text-withe/70 md:col-span-2 flex items-center gap-2 text-sm italic">
            <AlertTriangle className="w-6 h-6 inline-block mr-2" />
            este panel esta en desarrollo 🚧 va a ir cambiando continuamente
          </div>
        </div>
      </div>
    </div>
  );
}
