"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Filter, X } from "lucide-react";
import type { Categoria } from "../../types/catalog.types";

interface CategoryFilterProps {
  categorias: Categoria[];
  categoriaSeleccionada: string | null;
  onCategoriaChange: (categoriaId: string | null) => void;
  cantidadProductos: number;
  cantidadPorCategoria?: Record<string, number>;
}

// Iconos por categoría (puedes personalizar según tus categorías)
const getIconoCategoria = (nombreCategoria: string) => {
  const nombre = nombreCategoria.toLowerCase();

  if (nombre.includes("papeleria") || nombre.includes("papelería")) return "✂️";
  if (nombre.includes("ferreteria") || nombre.includes("ferretería"))
    return "🔧";
  if (nombre.includes("hogar")) return "🏠";
  if (nombre.includes("cacharro")) return "⏰";
  if (nombre.includes("electronico") || nombre.includes("electrónico"))
    return "📱";
  if (nombre.includes("ropa") || nombre.includes("textil")) return "👕";
  if (nombre.includes("juguete")) return "🧸";
  if (nombre.includes("deporte")) return "⚽";

  return "📦"; // Icono por defecto
};

export function CategoryFilter({
  categorias,
  categoriaSeleccionada,
  onCategoriaChange,
  cantidadProductos,
  cantidadPorCategoria = {},
}: CategoryFilterProps) {
  const handleCategoriaClick = (categoriaId: string) => {
    if (categoriaSeleccionada === categoriaId) {
      // Si ya está seleccionada, deseleccionar (mostrar todos)
      onCategoriaChange(null);
    } else {
      // Seleccionar nueva categoría
      onCategoriaChange(categoriaId);
    }
  };

  const limpiarFiltros = () => {
    onCategoriaChange(null);
  };

  return (
    <div className="space-y-4">
      {/* Header del filtro */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-700">Filtrar por Categoría</h3>
          <Badge className="text-xs bg-blue-100 text-blue-700">
            {cantidadProductos} productos
          </Badge>
        </div>

        {/* Botón limpiar filtros */}
        {categoriaSeleccionada && (
          <Button
            variant="outline"
            size="sm"
            onClick={limpiarFiltros}
            className="text-xs hover:bg-blue-50 hover:border-blue-300"
          >
            <X className="w-3 h-3 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Botones de categorías */}
      <div className="flex flex-wrap gap-2">
        {/* Botón "Todos" */}
        <Button
          variant={categoriaSeleccionada === null ? "default" : "outline"}
          size="sm"
          onClick={() => onCategoriaChange(null)}
          className={`flex items-center gap-2 transition-all ${
            categoriaSeleccionada === null
              ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-blue-500/25"
              : "border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Todos</span>
          <Badge 
            className={`text-xs ml-1 ${
              categoriaSeleccionada === null 
                ? "bg-blue-700 text-white" 
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {cantidadProductos}
          </Badge>
        </Button>

        {/* Botones por categoría */}
        {categorias.map((categoria) => {
          const isSelected = categoriaSeleccionada === categoria.idCategoria;
          const cantidadEnCategoria =
            cantidadPorCategoria[categoria.idCategoria] || 0;
          const icono = getIconoCategoria(categoria.nombre);

          return (
            <Button
              key={categoria.idCategoria}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => handleCategoriaClick(categoria.idCategoria)}
              className={`flex items-center gap-2 transition-all ${
                isSelected
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-blue-500/25"
                  : "border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
              }`}
            >
              <span className="text-sm">{icono}</span>
              <span className="capitalize">{categoria.nombre}</span>
              {cantidadEnCategoria > 0 && (
                <Badge
                  className={`text-xs ml-1 ${
                    isSelected 
                      ? "bg-blue-700 text-white" 
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {cantidadEnCategoria}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Indicador de filtro activo */}
      {categoriaSeleccionada && (
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded-lg">
          <Filter className="w-4 h-4" />
          <span>
            Mostrando productos de:{" "}
            <span className="font-medium">
              {
                categorias.find((c) => c.idCategoria === categoriaSeleccionada)
                  ?.nombre
              }
            </span>
          </span>
        </div>
      )}

      {/* Mensaje si no hay productos */}
      {cantidadProductos === 0 && categoriaSeleccionada && (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No hay productos en esta categoría</p>
          <Button
            variant="outline"
            size="sm"
            onClick={limpiarFiltros}
            className="mt-2 hover:bg-blue-50 hover:border-blue-300"
          >
            Ver todos los productos
          </Button>
        </div>
      )}
    </div>
  );
}