// app/(routes)/pagos/(components)/HeaderPagos/HeaderPagos.tsx
"use client";

import React, { useState } from "react";
import { FormCreateFacturaProveedor } from "../FormCreateFaacturaProveedor";
import { FormCreatePagoProveedor } from "../FormCreatePago";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle, CalendarClock, DollarSign, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export type HeaderPagosProps = {
  stats: {
    vencimientosProximos: number;
    totalPorPagar: {
      deudaUsd: number;
      deudaCop: number;
      deudaYuan: number;
    } | null;
  };
  onRefresh?: () => void; // <-- para refrescar KPIs al crear factura/pago
};

export function HeaderPagos({ stats, onRefresh }: HeaderPagosProps) {
  const [openCreateFacturaModal, setOpenCreateFacturaModal] = useState(false);
  const [openCreatePagoModal, setOpenCreatePagoModal] = useState(false);
  const { totalPorPagar, vencimientosProximos } = stats;

  const fmtCOP = (v: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v || 0);

  const fmtUSD = (v: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v || 0);

  const fmtCNY = (v: number) =>
    new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v || 0);

  const deudaCOP = totalPorPagar?.deudaCop ?? 0;
  const deudaUSD = totalPorPagar?.deudaUsd ?? 0;
  const deudaCNY = totalPorPagar?.deudaYuan ?? 0;

  const refreshStats = () => {
    onRefresh?.();
  };

  return (
    <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white shadow-lg rounded-2xl mx-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-6">
        {/* Izquierda: título/descr */}
        <div className="flex items-center gap-4 mb-6 lg:mb-0">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              PAGOS A PROVEEDORES
            </h1>
            <p className="text-blue-100 text-sm">
              Controla vencimientos y obligaciones por pagar
            </p>
          </div>
        </div>

        {/* Derecha: acciones */}
        <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-2">
          {/* Botón: Nueva FACTURA */}
          <Dialog
            open={openCreateFacturaModal}
            onOpenChange={setOpenCreateFacturaModal}
          >
            <DialogTrigger asChild>
              <Button
                onClick={() => setOpenCreateFacturaModal(true)}
                variant="ghost"
                size="sm"
                className="w-full lg:w-auto text-white hover:bg-white/10 border border-white/20 hover:border-white/30 transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span>Nueva factura proveedor</span>
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                    <Plus className="w-3 h-3 text-white" />
                  </div>
                  <span>Crear factura de proveedor</span>
                </DialogTitle>
                <DialogDescription>
                  Registra una nueva factura de proveedor
                </DialogDescription>
              </DialogHeader>

              <FormCreateFacturaProveedor
                setOpenModalCreate={setOpenCreateFacturaModal}
                onSuccess={refreshStats} // <-- refrescar KPIs al crear
              />
            </DialogContent>
          </Dialog>

          {/* Botón: Nuevo PAGO (sólido verde) */}
          <Dialog
            open={openCreatePagoModal}
            onOpenChange={setOpenCreatePagoModal}
          >
            <DialogTrigger asChild>
              <Button
                onClick={() => setOpenCreatePagoModal(true)}
                size="sm"
                className="w-full lg:w-auto bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white border border-white/10 shadow-md"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span>Nuevo pago a proveedor</span>
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-full flex items-center justify-center">
                    <Plus className="w-3 h-3 text-white" />
                  </div>
                  <span>Registrar pago a proveedor</span>
                </DialogTitle>
                <DialogDescription>
                  Crea un pago y aplica abonos a una o varias facturas con
                  saldo.
                </DialogDescription>
              </DialogHeader>

              <FormCreatePagoProveedor
                setOpenModalCreate={setOpenCreatePagoModal}
                onSuccess={refreshStats} // <-- refrescar KPIs al crear
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Vencimientos próximos */}
          <div className="rounded-xl bg-white/10 border border-white/10 p-4">
            <div className="text-xs text-blue-100 font-medium mb-1 flex items-center gap-2">
              <CalendarClock className="w-4 h-4" />
              Vencimientos próximos
            </div>
            <div className="text-3xl font-extrabold text-yellow-300">
              {Number(vencimientosProximos || 0).toLocaleString("es-CO")}
            </div>
            {Number(vencimientosProximos || 0) > 0 && (
              <div className="mt-2 text-xs text-yellow-200 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Pagos por vencer
              </div>
            )}
          </div>

          {/* Total por pagar (COP) */}
          <div className="rounded-xl bg-white/10 border border-white/10 p-4">
            <div className="text-xs text-blue-100 font-medium mb-1">
              Total por pagar (COP)
            </div>
            <div className="text-3xl font-extrabold text-green-300 font-mono break-words">
              {fmtCOP(deudaCOP)}
            </div>
          </div>

          {/* Total por pagar (USD) */}
          <div className="rounded-xl bg-white/10 border border-white/10 p-4">
            <div className="text-xs text-blue-100 font-medium mb-1">
              Total por pagar (USD)
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-white font-mono break-words">
              {fmtUSD(deudaUSD)}
            </div>
          </div>

          {/* Total por pagar (CNY) */}
          <div className="rounded-xl bg-white/10 border border-white/10 p-4">
            <div className="text-xs text-blue-100 font-medium mb-1">
              Total por pagar (CNY)
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-white font-mono break-words">
              {fmtCNY(deudaCNY)}
            </div>
          </div>
        </div>

        {/* Nota aclaratoria */}
        <div className="mt-3 text-[11px] text-blue-100/90">
          * Los totales se muestran por moneda. No se suman entre sí.
        </div>
      </div>
    </div>
  );
}
