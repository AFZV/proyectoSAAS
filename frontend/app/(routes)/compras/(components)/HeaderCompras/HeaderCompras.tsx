// app/(routes)/compras/(components)/HeaderCompras/HeaderCompras.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, RefreshCw, Plus, Users } from "lucide-react";
import { HeaderComprasProps } from "./HeaderCompras.types";

export function HeaderCompras({
  totalComprasHoy = 0,
  valorTotalComprasHoy = 0,
  totalProveedores = 0,
  onRefresh,
  onNuevaCompra,
}: HeaderComprasProps) {
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white shadow-lg rounded-2xl mx-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-6">
        {/* Lado izquierdo - Título, descripción y estadísticas */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 flex-1">
          {/* Título y descripción */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">COMPRAS</h1>
              <p className="text-green-100 text-sm">
                Administra y consulta todas las compras realizadas
              </p>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="flex items-center gap-6 ml-0 lg:ml-8">
            {/* Total Compras Hoy */}
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                {totalComprasHoy.toLocaleString()}
              </div>
              <div className="text-xs text-green-100 font-medium">
                Compras Hoy
              </div>
            </div>

            {/* Valor Total Hoy */}
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-300">
                {valorTotalComprasHoy > 0
                  ? formatCurrency(valorTotalComprasHoy)
                      .replace("$", "$")
                      .substring(0, 8) + "..."
                  : "$0"}
              </div>
              <div className="text-xs text-green-100 font-medium">
                Valor Hoy
              </div>
            </div>

            {/* Total Proveedores */}
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-300 flex items-center gap-1">
                <Users className="w-4 h-4" />
                {totalProveedores}
              </div>
              <div className="text-xs text-green-100 font-medium">
                Proveedores
              </div>
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

          {/* Botón Nueva Compra */}
          {onNuevaCompra && (
            <Button
              onClick={onNuevaCompra}
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border border-white/20 hover:border-white/40 transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nueva Compra</span>
            </Button>
          )}

          {/* Información adicional */}
          <div className="hidden lg:flex items-center gap-2 text-green-100 text-sm">
            <ShoppingCart className="w-4 h-4" />
            <span>Historial • Reportes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
