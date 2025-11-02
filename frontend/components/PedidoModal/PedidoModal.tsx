"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Package, User, FileText, Calendar, X } from "lucide-react";
import { formatValue } from "@/utils/FormartValue"; // ya la tienes en tu proyecto

// ===================== Tipos mínimos =====================
export type ProductoLinea = {
  productoId: string;
  nombre?: string;
  categoria?: string | null;
  imagenUrl?: string | null;
  cantidad: number;
  precio: number; // unitario
};

export type ClienteLite = {
  nombre?: string;
  apellidos?: string | null;
  rasonZocial?: string | null;
  nit?: string | null;
};

// ----- Pedido (visualización ligera) -----
export type PedidoLite = {
  id: string;
  fechaPedido: string;
  cliente?: ClienteLite | null;
  usuario?: { nombre?: string | null } | null; // vendedor (opcional)
  productos: ProductoLinea[];
  subtotal?: number | null; // si ya lo calculas en backend
  flete?: number | null;
  total: number;
  observaciones?: string | null;
};

export function PedidoModal({
  open,
  onClose,
  pedido,
}: {
  open: boolean;
  onClose: () => void;
  pedido: PedidoLite | null;
}) {
  const calcSubtotal =
    pedido?.subtotal ??
    pedido?.productos?.reduce((acc, p) => acc + p.cantidad * p.precio, 0) ??
    0;
  const flete = pedido?.flete ?? 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl w-[96vw] p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-600" />
                Pedido
                {pedido?.id && (
                  <span className="font-mono text-xs text-muted-foreground">
                    #{pedido.id.slice(0, 8)}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                {pedido?.fechaPedido
                  ? new Date(pedido.fechaPedido).toLocaleString("es-CO")
                  : "Fecha no disponible"}
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <Separator />

        <div className="px-5 py-4 space-y-4">
          {/* Cliente / Vendedor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground mb-1">Cliente</div>
              <div className="text-sm font-medium">
                {pedido?.cliente?.rasonZocial ||
                  `${pedido?.cliente?.nombre ?? ""} ${
                    pedido?.cliente?.apellidos ?? ""
                  }`.trim() ||
                  "—"}
              </div>
              {pedido?.cliente?.nit && (
                <div className="text-xs text-muted-foreground">
                  NIT: {pedido.cliente.nit}
                </div>
              )}
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground mb-1">Vendedor</div>
              <div className="text-sm font-medium">
                {pedido?.usuario?.nombre ?? "—"}
              </div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground mb-1">Totales</div>
              <div className="text-sm grid grid-cols-2 gap-y-1">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-right">{formatValue(calcSubtotal)}</span>
                <span className="text-muted-foreground">Flete</span>
                <span className="text-right">{formatValue(flete)}</span>
                <span className="font-medium">Total</span>
                <span className="text-right font-semibold text-sky-700">
                  {formatValue(pedido?.total ?? calcSubtotal + flete)}
                </span>
              </div>
            </div>
          </div>

          {/* Productos con scroll (máx. 7 filas visibles) */}
          <div className="rounded-xl border overflow-hidden">
            <div className="px-4 py-2 text-xs text-muted-foreground border-b flex items-center gap-2">
              <Package className="h-4 w-4" /> Productos del pedido (
              {pedido?.productos?.length ?? 0})
            </div>

            {/* Contenedor scrolleable: 7 filas aprox. (420px) */}
            <div className="overflow-y-auto max-h-[420px] overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-4 py-2">Producto</th>
                    <th className="text-center px-4 py-2">Cantidad</th>
                    <th className="text-right px-4 py-2">Precio</th>
                    <th className="text-right px-4 py-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido?.productos?.map((it) => {
                    const subtotal = (it.cantidad ?? 0) * (it.precio ?? 0);
                    return (
                      <tr
                        key={it.productoId}
                        className="border-b last:border-0"
                      >
                        <td className="px-4 py-2">
                          <div className="font-medium">
                            {it.nombre ?? it.productoId}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center tabular-nums">
                          {it.cantidad}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {formatValue(it.precio)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums font-medium">
                          {formatValue(subtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Observaciones */}
          {pedido?.observaciones && (
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground mb-1">
                Observaciones
              </div>
              <div className="text-sm whitespace-pre-line">
                {pedido.observaciones}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
