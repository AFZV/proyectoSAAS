// ProductCard/ProductCard.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Minus,
  ShoppingCart,
  Package,
  AlertCircle,
  Eye,
  Download,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatValue } from "@/utils/FormartValue";
import type {
  ProductCardProps,
  AddToCartModalProps,
} from "./ProductCard.types";

// Modal para agregar al carrito (simplificado)
function AddToCartModal({
  producto,
  isOpen,
  onClose,
  onConfirm,
  observacion, // <- NUEVO
  onChangeObservacion, // <- NUEVO
}: AddToCartModalProps) {
  const [cantidad, setCantidad] = useState(1);

  const handleConfirm = () => {
    if (cantidad > 0) {
      onConfirm(cantidad);
      setCantidad(1);
      onClose();
    }
  };

  const incrementar = () => setCantidad((prev) => prev + 1);
  const decrementar = () => setCantidad((prev) => Math.max(1, prev - 1));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            Agregar al Carrito
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Imagen y detalles del producto */}
          <div className="flex space-x-4">
            <div className="w-20 h-20 flex-shrink-0">
              <img
                src={producto.imagenUrl || "/placeholder-product.png"}
                alt={producto.nombre}
                className="w-full h-full object-cover rounded-md border"
              />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-md line-clamp-2 pb-2">
                {producto.nombre}
              </h3>
              <Badge variant="secondary" className="text-xs mt-1">
                {producto.categoria}
              </Badge>
              <p className="text-lg font-bold text-green-600 mt-2">
                {formatValue(producto.precio)}
              </p>
            </div>
          </div>
          {/* NUEVO: Observación por producto */}

          {/* Selector de cantidad */}
          <div className="space-y-2">
            <Label>Cantidad</Label>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={decrementar}
                disabled={cantidad <= 1}
                className="hover:bg-blue-50 hover:border-blue-300"
              >
                <Minus className="w-4 h-4" />
              </Button>

              <Input
                type="number"
                min="1"
                max={producto.stock}
                value={cantidad}
                onChange={(e) =>
                  setCantidad(
                    Math.max(
                      0,
                      Math.min(producto.stock, parseInt(e.target.value) || 0)
                    )
                  )
                }
                className="w-40 text-center focus:ring-blue-500 focus:border-blue-500"
              />

              <Button
                variant="outline"
                size="sm"
                onClick={incrementar}
                disabled={cantidad >= producto.stock}
                className="hover:bg-blue-50 hover:border-blue-300"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observación para este producto</Label>
            <textarea
              value={observacion ?? ""}
              onChange={(e) => onChangeObservacion?.(e.target.value)}
              className="w-full min-h-24 rounded-lg border border-input bg-background p-3 text-sm 
                         "
              placeholder="Ej: Entregar sin bolsa, color alterno si no hay, etc."
            />
            <p className="text-xs text-muted-foreground">
              Se incluirá automáticamente al finalizar el pedido.
            </p>
          </div>

          {/* Total */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center">
              <span className="font-medium text-blue-900">Subtotal:</span>
              <span className="text-lg font-bold text-blue-600">
                {formatValue(producto.precio * cantidad)}
              </span>
            </div>
          </div>

          {/* Botones */}
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-blue-500/25"
            >
              Agregar al Carrito
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente principal ProductCard actualizado
export function ProductCard({
  producto,
  onAgregarAlCarrito,
  onVerDetalles, // NUEVA PROP para abrir el modal de detalles
  onDescargarImagen,
  isInCart = false,
  cantidadEnCarrito = 0,
  observacion,
  onChangeObservacion,
}: ProductCardProps & { onVerDetalles?: (producto: any) => void } & {
  onDescargarImagen?: (producto: any) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showObs, setShowObs] = useState(false); // <- toggle inline opcional

  const handleModalAdd = (cantidad: number) => {
    onAgregarAlCarrito(producto, cantidad);
  };

  const isOutOfStock = producto.stock === 0;

  // Handler para hacer clic en la imagen
  const handleImageClick = () => {
    if (onVerDetalles) {
      onVerDetalles(producto);
    }
  };

  const handleDescargarImagen = () => {
    if (onDescargarImagen) {
      onDescargarImagen(producto);
    }
  };

  return (
    <>
      <Card
        className={`
        group hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col
        ${isOutOfStock ? "opacity-60" : "hover:scale-[1.02]"}
        ${
          isInCart
            ? "ring-1 ring-emerald-400 ring-offset-1 shadow-md shadow-emerald-500/20 border-emerald-200 bg-emerald-50/30"
            : "hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/10"
        }
      `}
      >
        <CardContent className="p-0 flex flex-col h-full">
          {/* Imagen del producto - ACTUALIZADA CON CLICK */}
          <div
            className="relative aspect-square overflow-hidden bg-muted flex-shrink-0 cursor-pointer"
            onClick={handleImageClick}
          >
            <img
              src={producto.imagenUrl || "/placeholder-product.png"}
              alt={producto.nombre}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {/* Overlay hover para indicar que es clickeable */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 hover:opacity-100">
              <div className="bg-white/90 rounded-full p-2 transform scale-75 hover:scale-100 transition-transform">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
            </div>

            {/* Badge de stock */}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Badge variant="destructive" className="text-sm">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Agotado
                </Badge>
              </div>
            )}

            {/* Badge de en carrito */}
            {isInCart && !isOutOfStock && (
              <div className="absolute top-2 right-2">
                <Badge className="bg-emerald-500 text-white shadow-md text-xs">
                  <ShoppingCart className="w-3 h-3 mr-1" />
                  {cantidadEnCarrito}
                </Badge>
              </div>
            )}

            {/* Categoría */}
            <div className="absolute top-2 left-2">
              <Badge
                variant="secondary"
                className="text-xs bg-white/90 text-gray-700"
              >
                {producto.categoria}
              </Badge>
            </div>
          </div>

          {/* Información del producto */}
          <div className="p-3 space-y-2 flex-1 flex flex-col">
            {/* Nombre */}
            <h3
              className="
    font-semibold 
    text-sm 
    sm:text-sm 
    md:text-base 
    lg:text-xs
    leading-tight line-clamp-2 min-h-[2.5rem] 
    cursor-pointer hover:text-blue-600 transition-colors
  "
              onClick={handleImageClick}
            >
              {producto.nombre}
            </h3>

            {/* Stock info */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                <span>Stock: {producto.stock}</span>
              </div>
            </div>

            {/* Precio */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-bold text-green-600">
                {formatValue(producto.precio)}
              </span>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col gap-1.5 mt-auto">
              {!isOutOfStock ? (
                <>
                  {/* Botón para ver detalles */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDescargarImagen()}
                      className="p-1 hover:bg-blue-50 rounded-full"
                      title="Descargar imagen del producto"
                    >
                      <Download className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>

                  {/* Botón para agregar al carrito */}
                  <Button
                    size="sm"
                    onClick={() => setIsModalOpen(true)}
                    className="w-full text-xs py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-blue-500/25"
                  >
                    <ShoppingCart className="w-3 h-3 mr-1" />
                    Agregar
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled
                  className="w-full text-xs py-1.5"
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Sin Stock
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal para seleccionar cantidad */}
      <AddToCartModal
        producto={producto}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleModalAdd}
        observacion={observacion} // <- pasa la observación
        onChangeObservacion={onChangeObservacion}
      />
    </>
  );
}
