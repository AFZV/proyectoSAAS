// app/reportes/page.tsx
"use client";

import React, { useState } from "react";
import { HeaderReportes } from "./components/HeaderReportes/HeaderReportes";
import { ReporteCard } from "./components/ReporteCard/ReporteCard";
import { FormReportes } from "./components/FormReportes/FormReportes";
import { ReporteCardData } from "./components/ReporteCard/ReporteCard.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Package, Users, FileText, CreditCard, DollarSign } from "lucide-react";

// Configuración de datos de reportes
const REPORTES_DATA: ReporteCardData[] = [
  {
    id: "inventario",
    title: "INVENTARIO",
    description: "Reportes de productos y stock",
    icon: Package,
    color: "bg-gradient-to-r from-blue-500 to-blue-600",
    options: [
      {
        id: "general",
        label: "Reporte General",
        description: "Todos los productos con su valor de inventario",
      },
      {
        id: "rango",
        label: "Por Rango de Letras",
        description:
          "Productos filtrados por inicial del nombre (A-C, D-F, etc.)",
      },
      {
        id: "productos",
        label: "Reporte Total de Productos",
        description: "Todos los productos activos",
      },
    ],
  },
  {
    id: "clientes",
    title: "CLIENTES",
    description: "Reportes de base de clientes",
    icon: Users,
    color: "bg-gradient-to-r from-green-500 to-green-600",
    options: [
      {
        id: "todos",
        label: "Todos los Clientes",
        description: "Lista completa de clientes registrados",
      },
      {
        id: "ciudad",
        label: "Por Ciudad",
        description: "Clientes filtrados por ubicación específica",
      },
      {
        id: "vendedor",
        label: "Por Vendedor",
        description: "Clientes asignados a cada vendedor",
      },
    ],
  },
  {
    id: "pedidos",
    title: "PEDIDOS",
    description: "Reportes de ventas y pedidos",
    icon: FileText,
    color: "bg-gradient-to-r from-orange-500 to-orange-600",
    options: [
      {
        id: "todos",
        label: "Todos los Pedidos",
        description: "Historial completo de pedidos por rango de fechas",
      },
      {
        id: "vendedor",
        label: "Por Vendedor",
        description: "Pedidos generados por cada vendedor específico",
      },
    ],
  },
  {
    id: "cartera",
    title: "CARTERA",
    description: "Reportes de cuentas por cobrar",
    icon: CreditCard,
    color: "bg-gradient-to-r from-red-500 to-red-600",
    options: [
      {
        id: "general",
        label: "Saldos Pendientes",
        description: "Pedidos con pagos pendientes por cobrar",
      },
      {
        id: "vendedor",
        label: "Por Vendedor",
        description: "Cartera pendiente agrupada por vendedor",
      },
      {
        id: "balance",
        label: "Balance General",
        description: "Resumen total de deudas por cliente y vendedor",
      },
    ],
  },
  {
    id: "recaudos",
    title: "RECAUDOS",
    description: "Reportes de pagos recibidos",
    icon: DollarSign,
    color: "bg-gradient-to-r from-purple-500 to-purple-600",
    options: [
      {
        id: "general",
        label: "Todos los Recaudos",
        description: "Historial completo de pagos recibidos",
      },
      {
        id: "vendedor",
        label: "Por Vendedor",
        description: "Recaudos agrupados por vendedor específico",
      },
    ],
  },
];

interface SelectedReporte {
  tipo: "inventario" | "clientes" | "pedidos" | "cartera" | "recaudos";
  opcion: string;
}

export default function ReportesPage() {
  const [selectedReporte, setSelectedReporte] =
    useState<SelectedReporte | null>(null);

  const handleSelectReporte = (tipo: string, opcionId: string) => {
    setSelectedReporte({
      tipo: tipo as
        | "inventario"
        | "clientes"
        | "pedidos"
        | "cartera"
        | "recaudos",
      opcion: opcionId,
    });
  };

  const handleCloseModal = () => {
    setSelectedReporte(null);
  };

  const handleRefresh = () => {
    // Aquí podrías recargar datos de reportes generados
    window.location.reload();
  };

  const getCurrentReporteData = () => {
    if (!selectedReporte) return null;

    const reporteData = REPORTES_DATA.find(
      (r) => r.id === selectedReporte.tipo
    );
    const opcionData = reporteData?.options.find(
      (o) => o.id === selectedReporte.opcion
    );

    return { reporteData, opcionData };
  };

  const { reporteData, opcionData } = getCurrentReporteData() || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <HeaderReportes
        totalReportesGenerados={10} // 10 reportes reales del backend (incluye balance)
        onRefresh={handleRefresh}
      />

      {/* Grid de tarjetas de reportes */}
      <div className="px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
          {REPORTES_DATA.map((reporte) => (
            <div key={reporte.id} className="h-full">
              <ReporteCard data={reporte} onSelect={handleSelectReporte} />
            </div>
          ))}
        </div>
      </div>

      {/* Modal para configurar reporte */}
      <Dialog open={!!selectedReporte} onOpenChange={handleCloseModal}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-sm sm:text-base">
              {reporteData && (
                <>
                  <reporteData.icon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  <span className="truncate">{opcionData?.label}</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {opcionData?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6">
            {selectedReporte && (
              <FormReportes
                tipo={selectedReporte.tipo}
                opcion={selectedReporte.opcion}
                onClose={handleCloseModal}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Información adicional */}
      <div className="px-6">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            📋 Información sobre Reportes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800">
                Formatos disponibles:
              </h4>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Excel (.xlsx) - Análisis completo de datos
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  PDF - En desarrollo 🚧
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800">Características:</h4>
              <ul className="space-y-1">
                <li>• Filtros por fechas y parámetros específicos</li>
                <li>• Descarga automática e instantánea</li>
                <li>• Datos en tiempo real</li>
                <li>
                  • <strong>Inventario y Clientes: Sin fechas</strong>
                </li>
                <li>
                  • <strong>Balance General: Sin fechas</strong>
                </li>
                <li>
                  • <strong>Recaudos: Con fechas obligatorias</strong>
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800">Tipos de reportes:</h4>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  <Package className="w-3 h-3 text-blue-500" />
                  Inventario y productos
                </li>
                <li className="flex items-center gap-2">
                  <Users className="w-3 h-3 text-green-500" />
                  Base de clientes
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="w-3 h-3 text-orange-500" />
                  Pedidos y ventas
                </li>
                <li className="flex items-center gap-2">
                  <CreditCard className="w-3 h-3 text-red-500" />
                  Cuentas por cobrar + Balance
                </li>
                <li className="flex items-center gap-2">
                  <DollarSign className="w-3 h-3 text-purple-500" />
                  Recaudos e ingresos
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
