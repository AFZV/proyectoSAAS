"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Phone,
  MapPin,
  Truck,
  CheckCircle,
  FileText,
  Edit3,
} from "lucide-react";
import { formatValue } from "@/utils/FormartValue";
import type { Pedido } from "../../types/invoices.types";

interface CompactViewProps {
  pedidos: Pedido[];
  userType: string;
  getEstadoActual: (pedido: Pedido) => string;
  getFechaParaMostrar: (pedido: Pedido) => string;
  getEstadoBadge: (estado: string) => React.ReactNode;
  onVerDetalle: (pedido: Pedido) => void;
  onEditarPedido: (pedido: Pedido) => void;
  onDescargarPdf: (pedido: Pedido) => void;
}

export function RenderCompactView({
  pedidos,
  userType,
  getEstadoActual,
  getFechaParaMostrar,
  getEstadoBadge,
  onVerDetalle,
  onEditarPedido,
  onDescargarPdf,
}: CompactViewProps) {
  return (
    <div className="overflow-hidden">
      <div className="min-w-full">
        {/* Header fijo */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-2">ID</div>
            <div className="col-span-4">Cliente</div>
            <div className="col-span-2">Total</div>
            <div className="col-span-2">Estado</div>
            <div className="col-span-2">Acciones</div>
          </div>
        </div>

        {/* Filas */}
        <div className="divide-y divide-gray-200">
          {pedidos.map((pedido) => {
            const estadoActual = getEstadoActual(pedido);
            const saldoPendiente = Number(pedido.saldoPendiente ?? 0);
            const estaPagado = saldoPendiente === 0;

            return (
              <div
                key={pedido.id}
                className="px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onVerDetalle(pedido)}
              >
                <div className="grid grid-cols-12 gap-2 items-center">
                  {/* ID */}
                  <div className="col-span-2">
                    <span className="text-sm font-mono text-blue-600 font-medium">
                      #{pedido.id.slice(0, 5).toUpperCase()}
                    </span>
                  </div>

                  {/* Cliente */}
                  <div className="col-span-4 min-w-0">
                    <div className="truncate">
                      <div className="text-sm font-medium text-gray-900 break-words">
                        {pedido.cliente?.rasonZocial}
                      </div>
                      <div className="text-sm text-gray-700 -mt-0.5 break-words">
                        {(pedido.cliente?.nombre ?? "") +
                          " " +
                          (pedido.cliente?.apellidos ?? "")}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        {pedido.cliente?.telefono && (
                          <span className="text-xs text-gray-500 flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {pedido.cliente.telefono}
                          </span>
                        )}
                        {pedido.cliente?.ciudad && (
                          <span className="text-xs text-gray-500 flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {pedido.cliente.ciudad}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="col-span-2">
                    <div className="text-sm font-medium text-gray-900">
                      {formatValue(pedido.total || 0)}
                    </div>
                    {pedido.flete && (
                      <div className="text-xs text-orange-600 flex items-center mt-1">
                        <Truck className="h-3 w-3 mr-1" />+
                        {formatValue(pedido.flete)}
                      </div>
                    )}
                  </div>

                  {/* Estado + Saldo */}
                  <div className="col-span-2">
                    <div className="flex items-center space-x-1">
                      {getEstadoBadge(estadoActual)}
                      {estadoActual === "ENVIADO" && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(getFechaParaMostrar(pedido)).toLocaleDateString(
                        "es-CO",
                        {
                          day: "2-digit",
                          month: "2-digit",
                        }
                      )}
                    </div>

                    {/* Indicador de saldo */}
                    {estaPagado ? (
                      <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-[11px] font-medium text-green-700 border border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Sin saldo pendiente
                      </div>
                    ) : (
                      <div className="mt-1 text-[11px] text-amber-700 bg-amber-50 inline-flex px-2 py-0.5 rounded-full border border-amber-200">
                        Saldo: {formatValue(saldoPendiente)}
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="col-span-2">
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onVerDetalle(pedido);
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1"
                      >
                        {/* <Eye className="h-4 w-4" /> */}
                      </Button>
                      {(userType === "admin" || userType === "bodega") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditarPedido(pedido);
                          }}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      )}
                      {["admin", "vendedor", "CLIENTE"].includes(userType) &&
                        [
                          "GENERADO",
                          "ACEPTADO",
                          "SEPARADO",
                          "FACTURADO",
                          "ENVIADO",
                        ].includes(estadoActual) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDescargarPdf(pedido);
                            }}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 p-1"
                            title="Descargar comprobante PDF"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 p-1"
                      >
                        {/* <MoreHorizontal className="h-4 w-4" /> */}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
