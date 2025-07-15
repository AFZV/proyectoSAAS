// app/reportes/(components)/HeaderReportes/HeaderReportes.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, RefreshCw, Download } from "lucide-react";
import { HeaderReportesProps } from "./HeaderReportes.types";

export function HeaderReportes({
  totalReportesGenerados = 0,
  onRefresh,
}: HeaderReportesProps) {
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white shadow-lg rounded-2xl mx-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-6">
        {/* Lado izquierdo - Título, descripción y estadísticas */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 flex-1">
          {/* Título y descripción */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">REPORTES</h1>
              <p className="text-blue-100 text-sm">
                Genera reportes profesionales para tu negocio
              </p>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="flex items-center gap-6 ml-0 lg:ml-8">
            {/* Total Reportes */}
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                {totalReportesGenerados}
              </div>
              <div className="text-xs text-blue-100 font-medium">
                Reportes Hoy
              </div>
            </div>

            {/* Formatos Disponibles */}
            <div className="text-center">
              <div className="text-3xl font-bold text-green-300">2</div>
              <div className="text-xs text-blue-100 font-medium">Formatos</div>
            </div>
          </div>
        </div>

        {/* Lado derecho - Botones de acción */}
        <div className="flex items-center gap-3 mt-4 lg:mt-0 w-full lg:w-auto justify-end">
          {/* Botón Actualizar */}
          <Button
            onClick={handleRefresh}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 border border-white/20 hover:border-white/30 transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>

          {/* Información de formatos */}
          <div className="hidden lg:flex items-center gap-2 text-blue-100 text-sm">
            <Download className="w-4 h-4" />
            <span>Excel • PDF 🚧</span>
          </div>
        </div>
      </div>
    </div>
  );
}
