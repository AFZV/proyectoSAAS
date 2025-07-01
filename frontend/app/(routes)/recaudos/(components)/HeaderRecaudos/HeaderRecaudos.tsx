"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReceiptText, FileSpreadsheet, Plus, Edit3 } from "lucide-react";
import { FormCrearRecibo } from "../formCrearRecaudo";
import { DatePickerWithRange } from "../FormExportRecaudos";
import { FormUpdateRecibo } from "../FormUpdateRecaudo";

export type Stats = {
  totalRecibos: number;
  totalRecaudado: number;
  totalPorRecaudar: number;
};

export function HeaderRecaudos({
  rol,
  onReciboCreado,
  stats,
}: {
  rol: string;
  onReciboCreado?: () => void;
  stats: Stats;
}) {
  console.log("debugPedidos desde backend:", stats);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openExportModal, setOpenExportModal] = useState(false);
  const [openUpdateModal, setOpenUpdateModal] = useState(false);

  return (
    <div className="border-b bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
              <ReceiptText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                RECIBOS
              </h1>
              <p className="text-sm text-muted-foreground">
                Gestión de cobros y recaudos
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setOpenUpdateModal(true)}
              className="flex items-center space-x-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-800"
            >
              <Edit3 className="w-4 h-4" />
              <span>Actualizar Recibo</span>
            </Button>
            <Button
              onClick={() => setOpenCreateModal(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Recibo</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Recibos"
            value={stats.totalRecibos}
            color="blue"
            description="Recibos registrados"
          />
          <StatCard
            title="Total Recaudado"
            value={stats.totalRecaudado.toLocaleString("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 0,
            })}
            color="green"
            description="Ingresos por recibos"
          />
          <StatCard
            title="Pendiente por recaudar"
            value={stats.totalPorRecaudar.toLocaleString("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 0,
            })}
            color="yellow"
            description="Total Pendiente Por Recaudar"
          />
        </div>
      </div>

      <Dialog open={openCreateModal} onOpenChange={setOpenCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                <Plus className="w-3 h-3 text-white" />
              </div>
              <span>Crear Recibo</span>
            </DialogTitle>
            <DialogDescription>Registra un nuevo recibo</DialogDescription>
          </DialogHeader>
          <FormCrearRecibo
            setOpenModalCreate={setOpenCreateModal}
            onSuccess={onReciboCreado}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={openUpdateModal} onOpenChange={setOpenUpdateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                <Edit3 className="w-3 h-3 text-white" />
              </div>
              <span>Actualizar Recibo</span>
            </DialogTitle>
            <DialogDescription>
              Busca y actualiza un recibo existente
            </DialogDescription>
          </DialogHeader>
          <FormUpdateRecibo setOpenModalUpdate={setOpenUpdateModal} />
        </DialogContent>
      </Dialog>

      <Dialog open={openExportModal} onOpenChange={setOpenExportModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                <FileSpreadsheet className="w-3 h-3 text-white" />
              </div>
              <span>Exportar Recibos</span>
            </DialogTitle>
            <DialogDescription>Filtra por rango de fechas</DialogDescription>
          </DialogHeader>
          <DatePickerWithRange
            onClose={() => setOpenExportModal(false)}
            rol={rol}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  color,
}: {
  title: string;
  value: number | string;
  description: string;
  color: "blue" | "green" | "yellow";
}) {
  const colorMap = {
    blue: {
      border: "border-blue-100 dark:border-blue-800",
      text: "text-blue-600",
      bg: "from-blue-500 to-blue-600",
    },
    green: {
      border: "border-green-100 dark:border-green-800",
      text: "text-green-600",
      bg: "from-green-500 to-green-600",
    },
    yellow: {
      border: "border-yellow-100 dark:border-yellow-800",
      text: "text-yellow-600",
      bg: "from-yellow-500 to-yellow-600",
    },
  }[color];

  return (
    <div
      className={`bg-white dark:bg-gray-800/50 rounded-lg p-4 border ${colorMap.border} shadow-sm hover:shadow-md transition-all duration-200`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold ${colorMap.text}`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <div
          className={`w-8 h-8 bg-gradient-to-r ${colorMap.bg} rounded-full flex items-center justify-center`}
        >
          <ReceiptText className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  );
}
