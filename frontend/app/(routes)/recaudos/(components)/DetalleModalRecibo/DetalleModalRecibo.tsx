"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReciboConRelaciones } from "../ListRecaudos/columns";
import { formatValue } from "@/utils/FormartValue";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  recibo: ReciboConRelaciones | null;
}

type AjusteItem = { idPedido: string; ajuste: number };

export function ReciboDetallesModal({ open, onClose, recibo }: Props) {
  const { getToken } = useAuth();
  const [ajustes, setAjustes] = useState<Record<string, number>>({}); // pedidoId -> ajuste

  useEffect(() => {
    if (!open || !recibo?.id) return;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/recibos/ajustesporrecibo/ajustes/${recibo.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          setAjustes({});
          return;
        }
        const data: AjusteItem[] = await res.json();
        const map: Record<string, number> = {};
        for (const it of data) map[it.idPedido] = Number(it.ajuste || 0);
        setAjustes(map);
      } catch (err) {
        console.error("Error cargando ajustes:", err);
        setAjustes({});
      }
    })();
  }, [open, recibo?.id, getToken]);

  if (!recibo) return null;

  const total = recibo.detalleRecibo.reduce((sum, d) => sum + d.valorTotal, 0);
  const fecha = new Date(recibo.Fechacrecion).toLocaleDateString("es-CO");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Recibo #{recibo.id.slice(0, 6).toUpperCase()} — {fecha}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded border p-3 bg-muted/30">
            <div className="text-sm">
              <b>Cliente:</b>{" "}
              {`${recibo.cliente?.nombre ?? ""} ${
                recibo.cliente?.apellidos ?? ""
              }`.trim() || "—"}
            </div>
            <div className="text-sm">
              <b>Concepto:</b> {recibo.concepto || "—"}
            </div>
            <div className="text-sm">
              <b>Tipo:</b> {recibo.tipo?.toUpperCase() || "—"}
            </div>
            <div className="text-sm">
              <b>Total recaudo:</b> {formatValue(total)}
            </div>
          </div>

          <div className="space-y-3">
            {recibo.detalleRecibo.map((d) => {
              const ajuste = ajustes[d.idPedido] ?? 0;
              return (
                <div key={d.idPedido} className="rounded border p-3">
                  <div className="text-sm font-semibold">
                    Pedido #{d.idPedido.slice(0, 6).toUpperCase()}
                  </div>
                  <div className="text-sm">
                    Abono: <b>{formatValue(d.valorTotal)}</b>
                  </div>
                  {ajuste > 0 && (
                    <div className="text-sm text-blue-700">
                      Ajuste (flete + descuento): <b>{formatValue(ajuste)}</b>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Saldo tras operación: {formatValue(d.saldoPendiente ?? 0)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
