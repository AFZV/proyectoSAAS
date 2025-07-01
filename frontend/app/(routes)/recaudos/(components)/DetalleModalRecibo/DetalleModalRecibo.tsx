"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, User, BadgeDollarSign } from "lucide-react";
import { ReciboConRelaciones } from "../ListRecaudos/columns";
import { formatValue } from "@/utils/FormartValue";

interface Props {
  open: boolean;
  onClose: () => void;
  recibo: ReciboConRelaciones | null;
}

export function ReciboDetallesModal({ open, onClose, recibo }: Props) {
  if (!recibo) return null;

  const total = recibo.detalleRecibo.reduce((sum, d) => sum + d.valorTotal, 0);
  const fecha = new Date(recibo.Fechacrecion).toLocaleDateString("es-CO");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Detalles del Recibo
          </DialogTitle>
          <DialogDescription>
            Información completa del recibo{" "}
            <strong>#{recibo.id.slice(0, 6)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-foreground">
          <div>
            <p>
              <strong>Fecha:</strong> {fecha}
            </p>
            <p>
              <strong>Tipo:</strong> {recibo.tipo}
            </p>
            <p>
              <strong>Concepto:</strong> {recibo.concepto}
            </p>
          </div>

          <div className="flex items-start gap-2">
            <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div>
              <p>
                <strong>Cliente:</strong> {recibo.cliente.nombre}{" "}
                {recibo.cliente.apellidos}
              </p>
              <p>
                <strong>NIT:</strong> {recibo.cliente.nit}
              </p>

              <p>
                <strong>Email:</strong> {recibo.cliente.email}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <BadgeDollarSign className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div className="w-full">
              <p className="mb-2">
                <strong>Pedidos Afectados:</strong>
              </p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2">Pedido</th>
                      <th className="px-3 py-2">Valor Abonado</th>
                      <th className="px-3 py-2">Saldo Pendiente</th>
                      <th className="px-3 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recibo.detalleRecibo.map((d) => (
                      <tr key={d.idPedido} className="border-t">
                        <td className="px-3 py-2">#{d.idPedido.slice(0, 6)}</td>
                        <td className="px-3 py-2">
                          {formatValue(d.valorTotal)}
                        </td>
                        <td className="px-3 py-2">
                          {formatValue(d.saldoPendiente)}
                        </td>
                        <td className="px-3 py-2 capitalize">{d.estado}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted font-semibold">
                      <td className="px-3 py-2 text-right" colSpan={1}>
                        Total Recibo:
                      </td>
                      <td className="px-3 py-2">{formatValue(total)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div>
              <p>
                <strong>Registrado por:</strong> {recibo.usuario.nombre} (
                {recibo.usuario.rol})
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
