"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
  ArrowRight,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatValue } from "@/utils/FormartValue";
import type { CarritoItem } from "../../types/catalog.types";

interface CartItemProps {
  item: CarritoItem;
  onUpdateCantidad: (productoId: string, nuevaCantidad: number) => void;
  onRemoveItem: (productoId: string) => void;
  tipoPrecio: "mayor" | "mostrador";
  getPrecioConTipo: (precio: number) => number;
}

// Componente para item individual del carrito
function CartItem({
  item,
  onUpdateCantidad,
  onRemoveItem,
  getPrecioConTipo,
  tipoPrecio,
}: CartItemProps) {
  const incrementar = () => onUpdateCantidad(item.id, item.cantidad + 1);
  const decrementar = () =>
    onUpdateCantidad(item.id, Math.max(1, item.cantidad - 1));
  const eliminar = () => onRemoveItem(item.id);

  const subtotal = getPrecioConTipo(item.precio) * item.cantidad;

  return (
    <div className="flex items-start space-x-3 p-3 border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors">
      {/* Imagen del producto */}
      <div className="w-16 h-16 flex-shrink-0">
        <img
          src={item.imagenUrl || "/placeholder-product.png"}
          alt={item.nombre}
          className="w-full h-full object-cover rounded-md border"
        />
      </div>

      {/* Información del producto */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm line-clamp-2 leading-tight">
          {item.nombre}
        </h4>
        <p className="text-xs text-muted-foreground mt-1">{item.categoria}</p>
        <p className="text-sm font-semibold text-green-600 mt-1">
          {formatValue(getPrecioConTipo(item.precio))} c/u
        </p>
      </div>

      {/* Controles de cantidad y precio */}
      <div className="flex flex-col items-end space-y-2">
        {/* Subtotal */}
        <div className="text-right">
          <p className="font-bold text-sm text-blue-600">
            {formatValue(subtotal)}
          </p>
        </div>

        {/* Controles de cantidad */}
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={decrementar}
            disabled={item.cantidad <= 1}
            className="h-6 w-6 p-0 hover:bg-blue-50 hover:border-blue-300"
          >
            <Minus className="w-3 h-3" />
          </Button>

          <span className="w-8 text-center text-sm font-medium">
            {item.cantidad}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={incrementar}
            className="h-6 w-6 p-0 hover:bg-blue-50 hover:border-blue-300"
          >
            <Plus className="w-3 h-3" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={eliminar}
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface CartSidebarProps {
  carrito: CarritoItem[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateCantidad: (productoId: string, nuevaCantidad: number) => void;
  onRemoveItem: (productoId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  isLoading?: boolean;
  tipoPrecio: "mayor" | "mostrador";
  getPrecioConTipo: (precio: number) => number;
}

export function CartSidebar({
  carrito,
  isOpen,
  onOpenChange,
  onUpdateCantidad,
  onRemoveItem,
  onClearCart,
  onCheckout,
  isLoading = false,
  tipoPrecio,
  getPrecioConTipo,
}: CartSidebarProps) {
  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const totalPrecio = React.useMemo(
    () =>
      carrito.reduce(
        (sum, item) => sum + getPrecioConTipo(item.precio) * item.cantidad,
        0
      ),
    [carrito, getPrecioConTipo]
  );

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button className="relative bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-blue-500/25">
          <ShoppingCart className="w-4 h-4 mr-2" />
          Carrito
          {totalItems > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 text-white">
              {totalItems > 99 ? "99+" : totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full max-w-md flex flex-col h-full">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2 text-blue-700">
            <ShoppingCart className="w-5 h-5" />
            Mi Carrito
            {totalItems > 0 && (
              <Badge className="bg-blue-500 text-white">
                {totalItems} item{totalItems === 1 ? "" : "s"}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {carrito.length === 0
              ? "Tu carrito está vacío"
              : `${carrito.length} producto${
                  carrito.length === 1 ? "" : "s"
                } en tu carrito`}
          </SheetDescription>
        </SheetHeader>

        {/* Contenido del carrito */}
        <div className="flex-1 flex flex-col min-h-0">
          {carrito.length === 0 ? (
            /* Carrito vacío */
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-12 h-12 text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium text-lg mb-2">
                  Tu carrito está vacío
                </h3>
                <p className="text-muted-foreground text-sm">
                  Agrega productos desde el catálogo para comenzar tu pedido
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="mt-4 hover:bg-blue-50 hover:border-blue-300"
              >
                <Package className="w-4 h-4 mr-2" />
                Explorar Productos
              </Button>
            </div>
          ) : (
            /* Lista de productos */
            <>
              {/* Header con botón limpiar */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-blue-700">
                  Productos
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearCart}
                  className="text-destructive hover:text-destructive hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Limpiar
                </Button>
              </div>

              {/* Lista scrolleable de items */}
              <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                {carrito.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onUpdateCantidad={onUpdateCantidad}
                    onRemoveItem={onRemoveItem}
                    tipoPrecio={tipoPrecio}
                    getPrecioConTipo={getPrecioConTipo}
                  />
                ))}
              </div>

              {/* Footer con total y checkout */}
              <div className="flex-shrink-0 pt-4 border-t space-y-4">
                {/* Resumen de totales */}
                <div className="space-y-2 bg-blue-50 p-3 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal ({totalItems} items):</span>
                    <span className="font-medium">
                      {formatValue(totalPrecio)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span className="text-blue-700">Total:</span>
                    <span className="text-blue-600">
                      {formatValue(totalPrecio)}
                    </span>
                  </div>
                </div>

                {/* Botón de checkout */}
                <Button
                  onClick={onCheckout}
                  disabled={isLoading || carrito.length === 0}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-blue-500/25"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      Proceder al Pedido
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                {/* Información adicional */}
                <p className="text-xs text-muted-foreground text-center">
                  Podrás revisar tu pedido antes de confirmarlo
                </p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
