"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Package,
  Search,
  ArrowRight,
  ChevronLeft,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  getProveedoresParaOC,
  getProductosParaOC,
  crearOrdenCompra,
} from "../../services/ordenes-compra.service";
import type {
  ProveedorOC,
  ProductoParaOC,
  CartOCItem,
} from "../../types/ordenes-compra.types";

// ── helpers ───────────────────────────────────────────────────────────────────

function getPrecioDisplay(p: ProductoParaOC) {
  if (p.precioCompraExterior && p.monedaCompraExterior) {
    return `${p.monedaCompraExterior} ${p.precioCompraExterior.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`;
  }
  return `COP ${p.precioCompra.toLocaleString("es-CO", { minimumFractionDigits: 0 })}`;
}

// Umbral alineado con RecomendacionCompra (estadisticas.service.ts): <=30% del stock
// de referencia se considera stock bajo.
type StockStatus = "agotado" | "critico" | "bajo" | "normal";

function getStockStatus(stock: number, stockReferencia?: number): StockStatus {
  if (stock <= 0) return "agotado";
  if (stockReferencia && stockReferencia > 0) {
    const ratio = stock / stockReferencia;
    if (ratio <= 0.15) return "critico";
    if (ratio <= 0.3) return "bajo";
  }
  return "normal";
}

const STOCK_STATUS_STYLES: Record<
  StockStatus,
  { label: string | null; overlay: string; ring: string; text: string }
> = {
  agotado: {
    label: "Agotado",
    overlay: "bg-red-600 text-white",
    ring: "ring-1 ring-red-300 border-red-200",
    text: "text-red-600 font-semibold",
  },
  critico: {
    label: "Stock crítico",
    overlay: "bg-orange-500 text-white",
    ring: "ring-1 ring-orange-200 border-orange-200",
    text: "text-orange-600 font-semibold",
  },
  bajo: {
    label: "Stock bajo",
    overlay: "bg-amber-400 text-amber-950",
    ring: "ring-1 ring-amber-200 border-amber-200",
    text: "text-amber-600 font-medium",
  },
  normal: {
    label: null,
    overlay: "",
    ring: "",
    text: "text-muted-foreground",
  },
};

function buildCartItem(producto: ProductoParaOC, cantidad: number): CartOCItem {
  return {
    productoId: producto.id,
    nombre: producto.nombre,
    referencia: producto.referencia,
    imagenUrl: producto.imagenUrl,
    cantidad,
    precioUnitario: producto.precioCompraExterior ?? producto.precioCompra,
    moneda: producto.monedaCompraExterior ?? "COP",
    unidadesPorBulto: producto.unidadesPorBulto,
  };
}

// ── ProductCardOC ─────────────────────────────────────────────────────────────

function ProductCardOC({
  producto,
  cantidad,
  onSetCantidad,
}: {
  producto: ProductoParaOC;
  cantidad: number;
  onSetCantidad: (n: number) => void;
}) {
  const inCart = cantidad > 0;
  const stockStatus = getStockStatus(producto.stock, producto.stockReferencia);
  const stockStyle = STOCK_STATUS_STYLES[stockStatus];

  return (
    <Card
      className={`overflow-hidden transition-all duration-200 ${
        inCart
          ? "ring-2 ring-blue-500 ring-offset-1 border-blue-300"
          : `hover:shadow-md ${stockStyle.ring || "hover:border-blue-200"}`
      }`}
    >
      <CardContent className="p-0 flex flex-col h-full">
        {/* Imagen */}
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          <img
            src={producto.imagenUrl || "/placeholder-product.png"}
            alt={producto.nombre}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder-product.png";
            }}
          />
          {inCart && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-blue-500 text-white text-xs">
                <ShoppingCart className="w-3 h-3 mr-1" />
                {cantidad}
              </Badge>
            </div>
          )}
          {producto.categoria && (
            <div className="absolute top-2 left-2">
              <Badge
                variant="secondary"
                className="text-xs bg-white/90 text-gray-700"
              >
                {producto.categoria}
              </Badge>
            </div>
          )}
          {/* Leyenda de urgencia por nivel de stock */}
          {stockStyle.label && (
            <div
              className={`absolute bottom-0 inset-x-0 py-1 text-center text-[10px] font-bold uppercase tracking-wide ${stockStyle.overlay}`}
            >
              {stockStyle.label}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 flex flex-col gap-1.5 flex-1">
          <p className="font-semibold text-xs line-clamp-2 leading-tight">
            {producto.nombre}
          </p>
          {producto.referencia && (
            <p className="text-xs text-muted-foreground">
              Ref: {producto.referencia}
            </p>
          )}
          <p className="text-sm font-bold text-green-700">
            {getPrecioDisplay(producto)}
          </p>
          {producto.unidadesPorBulto && (
            <p className="text-xs text-muted-foreground">
              {producto.unidadesPorBulto} und/bulto
            </p>
          )}
          <div className="flex items-center gap-1 mt-auto">
            <Package className={`w-3 h-3 ${stockStyle.text}`} />
            <span className={`text-xs ${stockStyle.text}`}>
              Stock: {producto.stock}
            </span>
          </div>

          {/* Contador */}
          <div className="flex items-center gap-1 mt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onSetCantidad(Math.max(0, cantidad - 1))}
              disabled={cantidad === 0}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <Input
              type="number"
              min={0}
              value={cantidad === 0 ? "" : cantidad}
              placeholder="0"
              onChange={(e) => {
                const n = parseInt(e.target.value) || 0;
                onSetCantidad(Math.max(0, n));
              }}
              className="h-7 text-center text-xs px-1 w-14"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onSetCantidad(cantidad + 1)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── CartPanelOC ───────────────────────────────────────────────────────────────

function CartPanelOC({
  items,
  onUpdateCantidad,
  onRemove,
}: {
  items: CartOCItem[];
  onUpdateCantidad: (productoId: string, n: number) => void;
  onRemove: (productoId: string) => void;
}) {
  const subtotalesPorMoneda = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) {
      map[item.moneda] =
        (map[item.moneda] ?? 0) + item.precioUnitario * item.cantidad;
    }
    return map;
  }, [items]);

  const totalBultos = useMemo(
    () =>
      items.reduce((sum, item) => {
        const upb = item.unidadesPorBulto ?? 1;
        return sum + item.cantidad / upb;
      }, 0),
    [items],
  );

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-muted-foreground p-6">
        <ShoppingCart className="w-10 h-10" />
        <p className="text-sm">
          Agrega productos usando los contadores del catálogo
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {items.map((item) => (
          <div
            key={item.productoId}
            className="flex items-start gap-2 p-2 border rounded-md text-sm"
          >
            <img
              src={item.imagenUrl || "/placeholder-product.png"}
              alt={item.nombre}
              className="w-10 h-10 object-cover rounded flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "/placeholder-product.png";
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs line-clamp-1">{item.nombre}</p>
              {item.referencia && (
                <p className="text-xs text-muted-foreground">{item.referencia}</p>
              )}
              <p className="text-xs text-green-700 font-semibold">
                {item.moneda}{" "}
                {item.precioUnitario.toLocaleString("es-CO", {
                  minimumFractionDigits: 2,
                })}
                {" × "}
                {item.cantidad}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() =>
                  onUpdateCantidad(
                    item.productoId,
                    Math.max(1, item.cantidad - 1),
                  )
                }
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className="w-6 text-center text-xs font-medium">
                {item.cantidad}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() =>
                  onUpdateCantidad(item.productoId, item.cantidad + 1)
                }
              >
                <Plus className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-destructive"
                onClick={() => onRemove(item.productoId)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t space-y-2 bg-blue-50 rounded-md p-3">
        <p className="text-xs font-semibold text-blue-800">
          {items.length} producto(s) — {totalBultos.toFixed(2)} bultos
        </p>
        {Object.entries(subtotalesPorMoneda).map(([moneda, total]) => (
          <div key={moneda} className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal {moneda}:</span>
            <span className="font-bold text-blue-700">
              {total.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CrearOrdenCompraModal (principal) ─────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CrearOrdenCompraModal({ open, onClose }: Props) {
  const { getToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [proveedores, setProveedores] = useState<ProveedorOC[]>([]);
  const [proveedorId, setProveedorId] = useState("");
  const [productos, setProductos] = useState<ProductoParaOC[]>([]);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [busqueda, setBusqueda] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDatos, setLoadingDatos] = useState(false);

  // cargar proveedores cuando abre el modal
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setProveedorId("");
    setCantidades({});
    setObservaciones("");
    setBusqueda("");

    (async () => {
      const token = await getToken();
      if (!token) return;
      const prov = await getProveedoresParaOC(token);
      setProveedores(prov);
    })();
  }, [open]);

  // cargar productos al pasar al paso 2
  const irAPaso2 = async () => {
    if (!proveedorId) return;
    setLoadingDatos(true);
    const token = await getToken();
    if (token) {
      const prods = await getProductosParaOC(token);
      setProductos(prods);
    }
    setLoadingDatos(false);
    setStep(2);
  };

  const setCantidad = (productoId: string, n: number) => {
    setCantidades((prev) => ({ ...prev, [productoId]: n }));
  };

  const cartItems = useMemo((): CartOCItem[] => {
    return productos
      .filter((p) => (cantidades[p.id] ?? 0) > 0)
      .map((p) => buildCartItem(p, cantidades[p.id]));
  }, [productos, cantidades]);

  const productosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.referencia ?? "").toLowerCase().includes(q) ||
        (p.categoria ?? "").toLowerCase().includes(q),
    );
  }, [productos, busqueda]);

  const handleConfirmar = async () => {
    if (cartItems.length === 0) {
      toast({ title: "Agrega al menos un producto", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sin autenticación");
      await crearOrdenCompra(token, {
        proveedorId,
        observaciones: observaciones || undefined,
        detalles: cartItems.map((item) => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          moneda: item.moneda,
        })),
      });
      toast({ title: "Orden de compra creada exitosamente" });
      router.refresh();
      onClose();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const proveedorSeleccionado = proveedores.find(
    (p) => p.idProveedor === proveedorId,
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            Nueva Orden de Compra
            {step === 2 && proveedorSeleccionado && (
              <Badge variant="secondary" className="ml-2 font-normal">
                {proveedorSeleccionado.razonsocial}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* ── PASO 1: Seleccionar proveedor ── */}
        {step === 1 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-6 px-8">
            <div className="w-full max-w-md space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Proveedor *</label>
                <Select value={proveedorId} onValueChange={setProveedorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un proveedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {proveedores.map((p) => (
                      <SelectItem key={p.idProveedor} value={p.idProveedor}>
                        {p.razonsocial} — {p.identificacion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                disabled={!proveedorId || loadingDatos}
                onClick={irAPaso2}
              >
                {loadingDatos ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Seleccionar Productos
              </Button>
            </div>
          </div>
        )}

        {/* ── PASO 2: Catálogo + carrito ── */}
        {step === 2 && (
          <div className="flex flex-1 min-h-0">
            {/* Catálogo de productos */}
            <div className="flex-1 flex flex-col min-h-0 border-r">
              {/* Buscador */}
              <div className="px-4 py-3 border-b flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar productos..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {productosFiltrados.length} producto(s)
                </p>
              </div>

              {/* Grid de productos */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {productosFiltrados.map((p) => (
                    <ProductCardOC
                      key={p.id}
                      producto={p}
                      cantidad={cantidades[p.id] ?? 0}
                      onSetCantidad={(n) => setCantidad(p.id, n)}
                    />
                  ))}
                  {productosFiltrados.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                      <Package className="w-10 h-10" />
                      <p>No hay productos que coincidan</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Panel del carrito */}
            <div className="w-72 flex flex-col min-h-0 p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                Carrito OC
                {cartItems.length > 0 && (
                  <Badge className="bg-blue-500 text-white text-xs">
                    {cartItems.length}
                  </Badge>
                )}
              </h3>

              <div className="flex-1 min-h-0">
                <CartPanelOC
                  items={cartItems}
                  onUpdateCantidad={(id, n) => setCantidad(id, n)}
                  onRemove={(id) => setCantidad(id, 0)}
                />
              </div>

              {/* Observaciones + Confirmar */}
              <div className="mt-3 space-y-3 flex-shrink-0">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Observaciones
                  </label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full mt-1 rounded-md border border-input bg-background p-2 text-xs min-h-[60px] resize-none"
                    placeholder="Instrucciones especiales..."
                  />
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                  disabled={loading || cartItems.length === 0}
                  onClick={handleConfirmar}
                >
                  {loading ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  ) : null}
                  Crear Orden de Compra
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer con back */}
        {step === 2 && (
          <div className="px-4 py-2 border-t flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(1)}
              className="text-xs text-muted-foreground"
            >
              <ChevronLeft className="w-3 h-3 mr-1" />
              Cambiar proveedor
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
