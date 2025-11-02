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
import { User, FileText, Repeat, Wrench, X, Package } from "lucide-react";
import { formatValue } from "@/utils/FormartValue";

export type AjusteDTO = {
  id: string;
  fecha: string | Date;
  observaciones?: string | null;
  esReverso: boolean;
  reversaDeId?: string | null;
  usuario?: { id: string; nombre: string; apellidos?: string | null } | null;
  cliente?: {
    id: string;
    nit: string;
    rasonZocial?: string | null;
    nombre?: string | null;
    apellidos?: string | null;
  } | null;
  pedidos: { id: string; valor: number }[];
  valorTotal: number;
};

export function AjusteModal({
  open,
  onClose,
  ajuste,
}: {
  open: boolean;
  onClose: () => void;
  ajuste: AjusteDTO | null;
}) {
  const fechaTxt = ajuste?.fecha
    ? new Date(ajuste.fecha).toLocaleString("es-CO")
    : "Fecha no disponible";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl w-[95vw] p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                {ajuste?.esReverso ? (
                  <Repeat className="h-5 w-5 text-purple-600" />
                ) : (
                  <Wrench className="h-5 w-5 text-blue-600" />
                )}
                Ajuste
                {ajuste?.id && (
                  <span className="font-mono text-xs text-muted-foreground">
                    #{ajuste.id.slice(0, 8)}
                  </span>
                )}
                {ajuste?.esReverso && (
                  <Badge className="ml-2" variant="secondary">
                    Reverso
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>{fechaTxt}</DialogDescription>
              {ajuste?.esReverso && ajuste.reversaDeId && (
                <div className="text-xs text-purple-700">
                  Reversa de:{" "}
                  <span className="font-mono">
                    #{ajuste.reversaDeId.slice(0, 8)}
                  </span>
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <Separator />

        <div className="px-5 py-4 space-y-4">
          {/* Cabecera: Cliente / Usuario / Total */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                <User className="h-4 w-4" /> Cliente
              </div>
              <div className="text-sm font-medium">
                {ajuste?.cliente?.rasonZocial ||
                  `${ajuste?.cliente?.nombre ?? ""} ${
                    ajuste?.cliente?.apellidos ?? ""
                  }`.trim() ||
                  "—"}
              </div>
              {ajuste?.cliente?.nit && (
                <div className="text-xs text-muted-foreground">
                  NIT: {ajuste.cliente.nit}
                </div>
              )}
            </div>

            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground mb-1">Usuario</div>
              <div className="text-sm font-medium">
                {ajuste?.usuario
                  ? `${ajuste.usuario.nombre} ${
                      ajuste.usuario.apellidos ?? ""
                    }`.trim()
                  : "—"}
              </div>
            </div>

            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {ajuste?.esReverso ? "Total reverso" : "Total ajuste"}
              </div>
              <div
                className={`text-lg font-semibold ${
                  ajuste?.esReverso ? "text-purple-600" : "text-blue-600"
                }`}
              >
                {formatValue(ajuste?.valorTotal ?? 0)}
              </div>
            </div>
          </div>

          {/* Pedidos afectados */}
          <div className="rounded-xl border">
            <div className="px-4 py-2 text-xs text-muted-foreground border-b flex items-center gap-2">
              <Package className="h-4 w-4" />
              Pedidos afectados ({ajuste?.pedidos?.length ?? 0})
            </div>

            {ajuste?.pedidos && ajuste.pedidos.length > 0 ? (
              <ul className="divide-y max-h-48 overflow-auto">
                {ajuste.pedidos.map((p) => (
                  <li
                    key={p.id}
                    className="px-4 py-2 text-sm flex justify-between"
                  >
                    <span>Pedido #{p.id.slice(0, 6)}</span>
                    <span className="font-medium">{formatValue(p.valor)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                Sin pedidos asociados
              </div>
            )}
          </div>

          {/* Observaciones */}
          {ajuste?.observaciones && (
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground mb-1">
                Observaciones
              </div>
              <div className="text-sm whitespace-pre-line">
                {ajuste.observaciones}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
