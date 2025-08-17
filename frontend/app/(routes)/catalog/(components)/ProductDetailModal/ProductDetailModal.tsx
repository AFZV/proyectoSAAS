"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Minus,
  ShoppingCart,
  Package,
  Tag,
  Info,
  X,
  Eye,
} from "lucide-react";
import { formatValue } from "@/utils/FormartValue";
import type { Producto } from "../../types/catalog.types";

interface ProductDetailModalProps {
  producto: Producto | null;
  isOpen: boolean;
  onClose: () => void;
  onAgregarAlCarrito: (producto: Producto, cantidad: number) => void;
  isInCart?: boolean;
  cantidadEnCarrito?: number;
}

export function ProductDetailModal({
  producto,
  isOpen,
  onClose,
  onAgregarAlCarrito,
  isInCart = false,
  cantidadEnCarrito = 0,
}: ProductDetailModalProps) {
  const [cantidad, setCantidad] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);

  if (!producto) return null;

  const handleConfirm = () => {
    if (cantidad > 0) {
      onAgregarAlCarrito(producto, cantidad);
      setCantidad(1);
      onClose();
    }
  };

  const incrementar = () => setCantidad((prev) => prev + 1);
  const decrementar = () => setCantidad((prev) => Math.max(1, prev - 1));

  const isOutOfStock = producto.stock === 0;
  const subtotal = producto.precio * cantidad;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="
            w-[95vw] sm:w-auto 
            max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-4xl 
            max-h-[90vh] overflow-y-auto p-4 sm:p-6
          "
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Info className="w-6 h-6 text-blue-600" />
              Detalles del Producto
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna izquierda - Imagen */}
            <div className="space-y-4">
              <div
                className="relative aspect-square overflow-hidden rounded-lg border bg-muted cursor-pointer"
                onClick={() => setIsImageFullscreen(true)}
              >
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                )}

                <img
                  src={producto.imagenUrl || "/placeholder-product.png"}
                  alt={producto.nombre}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    imageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageLoaded(true)}
                />

                {/* Overlay hover */}
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-300 flex items-center justify-center opacity-0 hover:opacity-100">
                  <div className="bg-white/90 rounded-full p-3 transform scale-75 hover:scale-100 transition-transform">
                    <Eye className="w-6 h-6 text-blue-600" />
                  </div>
                </div>

                {/* Overlay para productos agotados */}
                {isOutOfStock && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Badge variant="destructive" className="text-lg px-4 py-2">
                      <Package className="w-5 h-5 mr-2" />
                      Producto Agotado
                    </Badge>
                  </div>
                )}

                {/* Badge de en carrito */}
                {isInCart && !isOutOfStock && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-emerald-500 text-white shadow-lg px-3 py-1">
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      En carrito: {cantidadEnCarrito}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="text-center text-sm text-muted-foreground">
                Haz clic en la imagen para ver en tamaño completo
              </div>
            </div>

            {/* Columna derecha - Detalles */}
            <div className="space-y-6">
              {/* GRID interna para tablets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre y categoría */}
                <div className="space-y-3">
                  <h1 className="text-2xl font-bold leading-tight">
                    {producto.nombre}
                  </h1>
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-600" />
                    <Badge variant="secondary" className="text-sm">
                      {producto.categoria}
                    </Badge>
                  </div>
                </div>

                {/* Precio */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex flex-col justify-center">
                  <span className="text-sm font-medium text-green-800">
                    Precio:
                  </span>
                  <span className="text-xl font-bold text-green-600">
                    {formatValue(producto.precio)}
                  </span>
                </div>

                {/* Stock */}
                <div className="md:col-span-2 flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <span className="font-medium text-blue-900">
                      Stock disponible:
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-lg font-bold ${
                          producto.stock > 10
                            ? "text-green-600"
                            : producto.stock > 0
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {producto.stock} unidades
                      </span>
                      {producto.stock <= 5 && producto.stock > 0 && (
                        <Badge
                          variant="outline"
                          className="text-xs text-yellow-700 border-yellow-300"
                        >
                          Stock bajo
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Selector de cantidad y subtotal */}
              {!isOutOfStock && (
                <div className="space-y-4">
                  <Label className="text-base font-medium">Cantidad:</Label>
                  <div className="flex items-center gap-3">
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
                      onChange={(e) => {
                        const value = Math.max(
                          1,
                          Math.min(
                            producto.stock,
                            parseInt(e.target.value) || 1
                          )
                        );
                        setCantidad(value);
                      }}
                      className="w-40 text-center text-lg font-medium"
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

                    <span className="ml-2 text-sm text-muted-foreground">
                      máx: {producto.stock}
                    </span>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-blue-900">
                        Subtotal ({cantidad}{" "}
                        {cantidad === 1 ? "unidad" : "unidades"}):
                      </span>
                      <span className="text-xl font-bold text-blue-600">
                        {formatValue(subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Botones */}
              <div className="space-y-3">
                {!isOutOfStock ? (
                  <Button
                    onClick={handleConfirm}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg text-lg py-5"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Agregar al Carrito
                  </Button>
                ) : (
                  <Button
                    disabled
                    variant="secondary"
                    className="w-full text-lg py-5"
                  >
                    <X className="w-5 h-5 mr-2" />
                    Producto Agotado
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={onClose}
                  className="w-full hover:bg-gray-50"
                >
                  Cerrar
                </Button>
              </div>

              {/* Info adicional */}
              {isInCart && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <ShoppingCart className="w-4 h-4" />
                    <span className="font-medium">
                      Ya tienes {cantidadEnCarrito}{" "}
                      {cantidadEnCarrito === 1 ? "unidad" : "unidades"} de este
                      producto en tu carrito
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal fullscreen para imagen */}
      <Dialog open={isImageFullscreen} onOpenChange={setIsImageFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-0">
          <div className="relative w-full h-full flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsImageFullscreen(false)}
              className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-6 h-6" />
            </Button>
            <img
              src={producto.imagenUrl || "/placeholder-product.png"}
              alt={producto.nombre}
              className="max-w-full max-h-full object-contain"
            />
            <div className="absolute bottom-4 left-4 right-4 text-center">
              <h3 className="text-white text-lg font-semibold bg-black/50 rounded-lg px-4 py-2 inline-block">
                {producto.nombre}
              </h3>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
