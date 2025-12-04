// app/recaudos/(components)/HeaderRecaudos/HeaderRecaudos.tsx
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReceiptText, Plus, Edit3, RefreshCw, FileDown } from "lucide-react";
import { FormCrearRecibo } from "../formCrearRecaudo";
import { FormUpdateRecibo } from "../FormUpdateRecaudo";
import { FormExportRecaudosHeader } from "../FormExportRecaudos";

export function HeaderRecaudos({ rol }: { rol: string }) {
  const [openCreate, setOpenCreate] = useState(false);
  const [openUpdate, setOpenUpdate] = useState(false);
  const [openExport, setOpenExport] = useState(false);

  return (
    <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white shadow-lg rounded-2xl mx-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-6">
        {/* ① Icono + título + subtítulo */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <ReceiptText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">RECIBOS</h1>
            <p className="text-blue-100 text-sm">
              Gestión de cobros y recaudos
            </p>
          </div>
        </div>

        {/* ② Botones lado derecho */}
        <div className="flex flex-wrap items-center gap-3 mt-4 lg:mt-0 w-full lg:w-auto justify-end">
          {/* Actualizar página */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
            className="text-white hover:bg-white/10 border border-white/20 hover:border-white/30"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>

          {/* Exportar Excel */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenExport(true)}
            className="bg-white/10 text-white border-white/30 hover:bg-white/20"
          >
            <FileDown className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </Button>

          {/* Actualizar Recibo */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpenUpdate(true)}
            className="text-white hover:bg-white/10 border border-white/20 hover:border-white/30"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Actualizar Recibo</span>
          </Button>

          {/* Crear Recibo */}
          <Button
            size="sm"
            onClick={() => setOpenCreate(true)}
            className="bg-white text-blue-600 hover:bg-blue-100"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Crear Recibo</span>
          </Button>
        </div>
      </div>

      {/* Modal CREAR */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              Crear Recibo
            </DialogTitle>
            <DialogDescription>Registra un nuevo recibo</DialogDescription>
          </DialogHeader>
          <FormCrearRecibo
            setOpenModalCreate={setOpenCreate}
            onSuccess={() => window.location.reload()}
          />
        </DialogContent>
      </Dialog>

      {/* Modal ACTUALIZAR */}
      <Dialog open={openUpdate} onOpenChange={setOpenUpdate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-blue-600" />
              Actualizar Recibo
            </DialogTitle>
            <DialogDescription>
              Busca y actualiza un recibo existente
            </DialogDescription>
          </DialogHeader>
          <FormUpdateRecibo setOpenModalUpdate={setOpenUpdate} />
        </DialogContent>
      </Dialog>

      {/* Modal EXPORTAR (igual al de reportes: ancho, centrado) */}
      <Dialog open={openExport} onOpenChange={setOpenExport}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-sm sm:text-base">
              <FileDown className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              <span className="truncate">Exportar recaudos a Excel</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Selecciona el rango de fechas de los recaudos que quieres
              exportar. Se descargará un archivo Excel listo para análisis.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6">
            <FormExportRecaudosHeader onClose={() => setOpenExport(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
