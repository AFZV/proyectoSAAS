// components/AdvancedFilters.tsx - ADAPTADO AL BACKEND EXISTENTE

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Filter, X } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { invoicesService } from "../services/invoices.service";
import type { Pedido } from "../types/invoices.types";

interface AdvancedFiltersProps {
  onFilteredResults: (pedidos: Pedido[]) => void;
  onClearFilters: () => void;
}

export function AdvancedFilters({
  onFilteredResults,
  onClearFilters,
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filtros, setFiltros] = useState({
    tipoFiltro: "id",
    filtro: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const { getToken } = useAuth();
  const { toast } = useToast();

  // ✅ Tipos de filtro que coinciden exactamente con tu backend
  const tiposFiltro = [
    { value: "id", label: "ID del Pedido", placeholder: "Ej: abc123..." },
    {
      value: "clienteId",
      label: "ID del Cliente",
      placeholder: "UUID del cliente",
    },
    {
      value: "usuarioId",
      label: "ID del Usuario/Vendedor",
      placeholder: "UUID del usuario",
    },
    { value: "total", label: "Total del Pedido", placeholder: "Ej: 150000" },
    {
      value: "empresaId",
      label: "ID de la Empresa",
      placeholder: "UUID de la empresa",
    },
    {
      value: "fechaPedido",
      label: "Fecha del Pedido",
      placeholder: "2024-01-15",
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!filtros.filtro.trim()) {
      toast({
        title: "Error",
        description: "Ingresa un valor para filtrar",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const token = await getToken();

      // ✅ Usar el servicio adaptado al backend existente
      const pedidosFiltrados = await invoicesService.filtrarPedidos(token!, {
        filtro: filtros.filtro.trim(),
        tipoFiltro: filtros.tipoFiltro as any,
      });

      onFilteredResults(pedidosFiltrados);
      setIsOpen(false);

      toast({
        title: "Filtros aplicados",
        description: `Se encontraron ${pedidosFiltrados.length} pedidos`,
      });
    } catch (error: any) {
      console.error("Error al filtrar:", error);
      toast({
        title: "Error al filtrar",
        description: error.message || "No se pudieron aplicar los filtros",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFiltros({ tipoFiltro: "id", filtro: "" });
    onClearFilters();
    setIsOpen(false);

    toast({
      title: "Filtros limpiados",
      description: "Se muestran todos los pedidos",
    });
  };

  const tipoFiltroSeleccionado = tiposFiltro.find(
    (t) => t.value === filtros.tipoFiltro
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filtros Avanzados
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Filtros Avanzados
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">
              Tipo de Filtro
            </Label>
            <select
              value={filtros.tipoFiltro}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, tipoFiltro: e.target.value }))
              }
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
            >
              {tiposFiltro.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">
              Valor a Buscar
            </Label>
            <Input
              type={
                filtros.tipoFiltro === "total"
                  ? "number"
                  : filtros.tipoFiltro === "fechaPedido"
                    ? "date"
                    : "text"
              }
              value={filtros.filtro}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, filtro: e.target.value }))
              }
              placeholder={
                tipoFiltroSeleccionado?.placeholder || "Ingresa el valor..."
              }
              className="mt-1"
            />

            {filtros.tipoFiltro === "fechaPedido" && (
              <p className="text-xs text-gray-500 mt-1">
                Busca pedidos de la fecha exacta seleccionada
              </p>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading || !filtros.filtro.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? "Filtrando..." : "Aplicar Filtro"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleClearFilters}
              className="flex-1"
            >
              Limpiar
            </Button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Notas importantes:
          </h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>
              • <strong>ID:</strong> Puedes buscar parte del ID del pedido
            </li>
            <li>
              • <strong>Total:</strong> Busca pedidos con el monto exacto
            </li>
            <li>
              • <strong>Fecha:</strong> Selecciona una fecha específica
            </li>
            <li>
              • <strong>IDs:</strong> Deben ser UUIDs completos válidos
            </li>
          </ul>
        </div>

        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs text-yellow-700">
            <strong>Tip:</strong> Los filtros son exactos. Para búsquedas más
            flexibles, usa la barra de búsqueda principal.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
