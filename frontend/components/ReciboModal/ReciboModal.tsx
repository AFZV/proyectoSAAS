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
import { ClienteLite } from "../PedidoModal/PedidoModal";
// ----- Recibo -----
export type ReciboResumen = {
  id: string;
  fecha: string;
  cliente?: ClienteLite | null;
  pedidos?: { id: string; numero?: string | null; valor?: number | null }[];
  valorTotal?: number | null;
  concepto?: string | null;
};

export function ReciboModal({
  open,
  onClose,
  recibo,
}: {
  open: boolean;
  onClose: () => void;
  recibo: ReciboResumen | null;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl w-[95vw] p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-rose-600" />
                Recibo
                {recibo?.id && (
                  <span className="font-mono text-xs text-muted-foreground">
                    #{recibo.id.slice(0, 8)}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription>
                {recibo?.fecha
                  ? new Date(recibo.fecha).toLocaleString("es-CO")
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
          {/* Cabecera cliente / total */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                <User className="h-4 w-4" /> Cliente
              </div>
              <div className="text-sm font-medium">
                {recibo?.cliente?.rasonZocial ||
                  `${recibo?.cliente?.nombre ?? ""} ${
                    recibo?.cliente?.apellidos ?? ""
                  }`.trim() ||
                  "—"}
              </div>
              {recibo?.cliente?.nit && (
                <div className="text-xs text-muted-foreground">
                  NIT: {recibo.cliente.nit}
                </div>
              )}
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                <Badge variant="destructive" className="rounded-full">
                  Recibido
                </Badge>
                Valor total
              </div>
              <div className="text-lg font-semibold text-rose-600">
                {formatValue(recibo?.valorTotal ?? 0)}
              </div>
            </div>
          </div>

          {/* Pedidos afectados */}
          {recibo?.pedidos && recibo.pedidos.length > 0 && (
            <div className="rounded-xl border">
              <div className="px-4 py-2 text-xs text-muted-foreground border-b">
                Pedidos afectados
              </div>
              <ul className="divide-y max-h-48 overflow-auto">
                {recibo.pedidos.map((p) => (
                  <li
                    key={p.id}
                    className="px-4 py-2 text-sm flex justify-between"
                  >
                    <span>
                      Pedido #{p.id.slice(0, 6)}
                      {p.numero ? ` • ${p.numero}` : ""}
                    </span>
                    <span className="font-medium">
                      {formatValue(p.valor ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Observaciones */}
          {recibo?.concepto && (
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground mb-1">
                Observaciones
              </div>
              <div className="text-sm whitespace-pre-line">
                {recibo.concepto}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
