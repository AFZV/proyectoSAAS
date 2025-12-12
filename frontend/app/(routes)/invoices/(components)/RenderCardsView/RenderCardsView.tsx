"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Phone,
  MapPin,
  User,
  Calendar,
  Truck,
  CheckCircle,
  FileText,
  Eye,
  Edit3,
} from "lucide-react";
import { formatValue } from "@/utils/FormartValue";
import type { Pedido } from "../../types/invoices.types";

interface CardsViewProps {
  pedidos: Pedido[];
  userType: string;
  getEstadoActual: (pedido: Pedido) => string;
  getFechaParaMostrar: (pedido: Pedido) => string;
  getNombreVendedor: (pedido: Pedido) => string;
  getEstadoBadge: (estado: string) => React.ReactNode;
  onVerDetalle: (pedido: Pedido) => void;
  onEditarPedido: (pedido: Pedido) => void;
  onDescargarPdf: (pedido: Pedido) => void;
}

export function RenderCardsView({
  pedidos,
  userType,
  getEstadoActual,
  getFechaParaMostrar,
  getNombreVendedor,
  getEstadoBadge,
  onVerDetalle,
  onEditarPedido,
  onDescargarPdf,
}: CardsViewProps) {
  return (
    <div className="grid gap-4 p-4">
      {pedidos.map((pedido) => {
        const estadoActual = getEstadoActual(pedido);
        const nombreVendedor = getNombreVendedor(pedido);

        const saldoPendiente = Number(pedido.saldoPendiente ?? 0);
        const estaPagado = saldoPendiente === 0;

        return (
          <div
            key={pedido.id}
            className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Header de la tarjeta */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    #{pedido.id.slice(0, 5).toUpperCase()}
                  </span>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-2">
                      {getEstadoBadge(estadoActual)}
                      {estadoActual === "ENVIADO" && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>

                    {/* Indicador de saldo */}
                    {estaPagado ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-[11px] font-medium text-green-700 border border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Sin saldo pendiente
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-[11px] font-medium text-amber-700 border border-amber-200">
                        Saldo: {formatValue(saldoPendiente)}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={`text-lg font-bold ${
                    estadoActual === "ENVIADO"
                      ? "text-green-600"
                      : estadoActual === "CANCELADO"
                      ? "text-red-600"
                      : "text-gray-900"
                  }`}
                >
                  {formatValue(pedido.total || 0)}
                </div>
              </div>
            </div>

            {/* Contenido principal */}
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Columna izquierda - Información del cliente */}
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900 break-words">
                      {pedido.cliente?.rasonZocial}
                    </div>
                    <div className="text-sm text-gray-700 -mt-0.5 break-words">
                      {(pedido.cliente?.nombre ?? "") +
                        " " +
                        (pedido.cliente?.apellidos ?? "")}
                    </div>
                    {pedido.cliente?.nit && (
                      <p className="text-sm text-gray-500">
                        NIT: {pedido.cliente.nit}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    {pedido.cliente?.telefono && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {pedido.cliente.telefono}
                        </span>
                      </div>
                    )}
                    {pedido.cliente?.ciudad && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {pedido.cliente.ciudad}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Columna derecha - Información del pedido */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {nombreVendedor}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {new Date(getFechaParaMostrar(pedido)).toLocaleDateString(
                        "es-CO"
                      )}
                    </span>
                  </div>

                  {(pedido.flete || pedido.guiaTransporte) && (
                    <div className="space-y-1">
                      {pedido.flete && (
                        <div className="flex items-center space-x-2">
                          <Truck
                            className={`h-4 w-4 ${
                              estadoActual === "ENVIADO"
                                ? "text-green-500"
                                : "text-orange-500"
                            }`}
                          />
                          <span
                            className={`text-sm font-medium ${
                              estadoActual === "ENVIADO"
                                ? "text-green-600"
                                : "text-orange-600"
                            }`}
                          >
                            Flete: {formatValue(pedido.flete)}
                          </span>
                        </div>
                      )}
                      {pedido.guiaTransporte && (
                        <p className="text-sm text-gray-600">
                          Guía:{" "}
                          <span className="font-mono">
                            {pedido.guiaTransporte}
                          </span>
                          {estadoActual === "ENVIADO" && (
                            <span className="text-green-600 ml-2">✓</span>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer con acciones */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onVerDetalle(pedido)}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver Detalles
                </Button>
                {userType === "admin" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditarPedido(pedido)}
                    className="text-gray-600 hover:bg-gray-50"
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                )}
                {["admin", "vendedor", "CLIENTE"].includes(userType) && (
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
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
