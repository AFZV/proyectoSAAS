// InvoiceDetailModal.tsx - ADAPTADO AL BACKEND EXISTENTE

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Package,
  Calendar,
  MapPin,
  Phone,
  Mail,
  FileText,
  Truck,
  X,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { formatValue } from "@/utils/FormartValue";
import { invoicesService } from "../../services/invoices.service";
import type { Pedido } from "../../types/invoices.types";
import { ESTADOS_PEDIDO } from "../../types/invoices.types";

interface InvoiceDetailModalProps {
  pedido: Pedido | null;
  isOpen: boolean;
  onClose: () => void;
  userType: string;
  onUpdate: (pedidoActualizado: Pedido) => void;
}

const ESTADOS_SIGUIENTES = {
  GENERADO: ["SEPARADO", "CANCELADO"],
  SEPARADO: ["FACTURADO", "CANCELADO"],
  FACTURADO: ["ENVIADO"],
  ENVIADO: ["ENTREGADO"],
  ENTREGADO: [],
  CANCELADO: [],
};

function InvoiceDetailModal({
  pedido,
  isOpen,
  onClose,
  userType,
  onUpdate,
}: {
  pedido: Pedido | null;
  isOpen: boolean;
  onClose: () => void;
  userType: string;
  onUpdate: (pedidoActualizado: Pedido) => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEstadoForm, setShowEstadoForm] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [guiaTransporte, setGuiaTransporte] = useState("");
  const [flete, setFlete] = useState("");

  const { getToken } = useAuth();
  const { toast } = useToast();

  // Agregar logs para debug

  if (!pedido) return null;

  const getEstadoActual = (pedido: Pedido): string => {
    if (!pedido.estados || pedido.estados.length === 0) {
      return "GENERADO";
    }
    const estadosOrdenados = pedido.estados.sort(
      (a, b) =>
        new Date(b.fechaEstado).getTime() - new Date(a.fechaEstado).getTime()
    );
    return estadosOrdenados[0].estado;
  };

  const estadoActual = getEstadoActual(pedido);
  const estadosSiguientes =
    {
      GENERADO: ["SEPARADO", "CANCELADO"],
      SEPARADO: ["FACTURADO", "CANCELADO"],
      FACTURADO: ["ENVIADO"],
      ENVIADO: ["ENTREGADO"],
      ENTREGADO: [],
      CANCELADO: [],
    }[estadoActual as keyof typeof ESTADOS_PEDIDO] || [];

  const handleCambiarEstado = async () => {
    if (!nuevoEstado) {
      toast({
        title: "Error",
        description: "Selecciona un estado",
        variant: "destructive",
      });
      return;
    }

    if (nuevoEstado === "ENVIADO" && !guiaTransporte.trim()) {
      toast({
        title: "Error",
        description: "La guía de transporte es requerida para enviar el pedido",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUpdating(true);

      // ✅ CORRECCIÓN: Verificar que el token existe
      const token = await getToken();
      if (!token) {
        toast({
          title: "Error de autenticación",
          description: "No se pudo obtener el token de autenticación",
          variant: "destructive",
        });
        return;
      }

      console.log("🔄 Iniciando actualización de estado:", {
        pedidoId: pedido.id,
        estadoActual,
        nuevoEstado,
        guiaTransporte: guiaTransporte.trim(),
        flete: flete ? parseFloat(flete) : undefined,
      });

      // ✅ Preparar datos para enviar
      const datosActualizacion = {
        estado: nuevoEstado,
        // guiaTransporte: guiaTransporte.trim(), // ✅ Enviar string, aunque sea vacío
        // flete: flete ? parseFloat(flete) : 0, // ✅ Enviar 0 en lugar de undefined
      };

      // ✅ Llamar al servicio con token verificado
      await invoicesService.actualizarEstadoPedido(
        token,
        pedido.id,
        datosActualizacion
      );

      // ✅ Crear estados array seguro
      const estadosActuales = pedido.estados || [];
      const nuevoEstadoObj = {
        id: Date.now().toString(),
        estado: nuevoEstado as any,
        fechaEstado: new Date().toISOString(),
        pedidoId: pedido.id,
      };

      const pedidoActualizado: Pedido = {
        ...pedido,
        guiaTransporte: guiaTransporte.trim() || pedido.guiaTransporte,
        flete: flete ? parseFloat(flete) : pedido.flete,
        fechaEnvio:
          nuevoEstado === "ENVIADO"
            ? new Date().toISOString()
            : pedido.fechaEnvio,
        estados: [...estadosActuales, nuevoEstadoObj],
      };

      onUpdate(pedidoActualizado);

      toast({
        title: "✅ Estado actualizado",
        description: `Pedido cambiado a ${ESTADOS_PEDIDO[nuevoEstado as keyof typeof ESTADOS_PEDIDO]?.label}`,
      });

      setShowEstadoForm(false);
      setNuevoEstado("");
    } catch (err: any) {
      console.error("❌ Error al cambiar estado:", err);
      toast({
        title: "Error al actualizar",
        description: err.message || "No se pudo cambiar el estado del pedido",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  const nombreCliente =
    pedido.cliente?.rasonZocial ||
    `${pedido.cliente?.nombre || "Cliente"} ${pedido.cliente?.apellidos || ""}`.trim();

  // Calcular total de items
  const totalItems =
    pedido.productos?.reduce((sum, item) => sum + (item.cantidad || 0), 0) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Detalles del Pedido #{pedido.id.slice(-8).toUpperCase()}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Estado actual y cambio */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    estadoActual === "GENERADO"
                      ? "bg-blue-100 text-blue-800"
                      : estadoActual === "SEPARADO"
                        ? "bg-yellow-100 text-yellow-800"
                        : estadoActual === "FACTURADO"
                          ? "bg-purple-100 text-purple-800"
                          : estadoActual === "ENVIADO"
                            ? "bg-orange-100 text-orange-800"
                            : estadoActual === "ENTREGADO"
                              ? "bg-green-100 text-green-800"
                              : estadoActual === "CANCELADO"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {ESTADOS_PEDIDO[estadoActual as keyof typeof ESTADOS_PEDIDO]
                    ?.label || estadoActual}
                </span>
              </div>

              {userType === "admin" &&
                estadosSiguientes.length > 0 &&
                !showEstadoForm && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEstadoForm(true)}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    Cambiar Estado
                  </Button>
                )}
            </div>
          </div>

          {/* Formulario para cambiar estado */}
          {showEstadoForm && userType === "admin" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-4">
                Cambiar Estado del Pedido
              </h4>
              <div className="space-y-4">
                <div>
                  <Label>Nuevo Estado</Label>
                  <select
                    value={nuevoEstado}
                    onChange={(e) => setNuevoEstado(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Seleccionar estado...</option>
                    {estadosSiguientes.map((estado) => (
                      <option key={estado} value={estado}>
                        {
                          ESTADOS_PEDIDO[estado as keyof typeof ESTADOS_PEDIDO]
                            ?.label
                        }
                      </option>
                    ))}
                  </select>
                </div>

                {nuevoEstado === "ENVIADO" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Guía de Transporte *</Label>
                      <Input
                        value={guiaTransporte}
                        onChange={(e) => setGuiaTransporte(e.target.value)}
                        placeholder="Número de guía"
                      />
                    </div>
                    <div>
                      <Label>Valor del Flete</Label>
                      <Input
                        type="number"
                        value={flete}
                        onChange={(e) => setFlete(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <Button
                    onClick={handleCambiarEstado}
                    disabled={isUpdating || !nuevoEstado}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isUpdating ? "Actualizando..." : "Confirmar"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowEstadoForm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Información del cliente */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 text-blue-600 mr-2" />
              Información del Cliente
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {nombreCliente}
                </p>
                {pedido.cliente?.nit && (
                  <p className="text-sm text-gray-500">
                    NIT: {pedido.cliente.nit}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-3 text-gray-400" />
                  <span>{pedido.cliente?.ciudad || "No especificado"}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-3 text-gray-400" />
                  <span>{pedido.cliente?.telefono || "No especificado"}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-3 text-gray-400" />
                  <span>{pedido.cliente?.correo || "No especificado"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Información del pedido */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 text-green-600 mr-2" />
              Información del Pedido
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    ID DEL PEDIDO
                  </p>
                  <p className="font-mono text-sm">{pedido.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    VENDEDOR
                  </p>
                  <p className="text-sm">
                    {pedido.usuario?.nombre || "softverse root root softverse"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    FECHA DE CREACIÓN
                  </p>
                  <p className="text-sm">
                    {new Date(pedido.fechaPedido).toLocaleDateString("es-CO")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    TOTAL
                  </p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatValue(pedido.total || 0)}
                  </p>
                </div>
              </div>

              {/* OBSERVACIONES - AGREGADO */}
              {pedido.observaciones && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                    OBSERVACIONES
                  </p>
                  <div className="bg-gray-50 p-3 rounded text-sm text-gray-700">
                    {pedido.observaciones}
                  </div>
                </div>
              )}

              {/* Información de envío */}
              {pedido.guiaTransporte && (
                <div className="mt-4 bg-orange-50 border border-orange-200 rounded p-4">
                  <h4 className="font-medium text-orange-900 mb-3 flex items-center">
                    <Truck className="h-4 w-4 mr-2" />
                    Información de Envío
                  </h4>
                  <div className="space-y-2 text-sm">
                    {pedido.fechaEnvio && (
                      <div className="flex justify-between">
                        <span className="text-orange-700">Fecha de envío:</span>
                        <span className="font-medium">
                          {new Date(pedido.fechaEnvio).toLocaleDateString(
                            "es-CO"
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-orange-700">
                        Guía de transporte:
                      </span>
                      <span className="font-medium">
                        {pedido.guiaTransporte}
                      </span>
                    </div>
                    {pedido.flete && (
                      <div className="flex justify-between">
                        <span className="text-orange-700">
                          Valor del flete:
                        </span>
                        <span className="font-medium">
                          {formatValue(pedido.flete)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Productos del pedido - CORREGIDO */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="h-5 w-5 text-orange-600 mr-2" />
              Productos del Pedido ({pedido.productos?.length || 0})
            </h3>

            {pedido.productos && pedido.productos.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Producto
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cantidad
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Precio Unit.
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pedido.productos.map((item, index) => {
                      const subtotal =
                        (item.cantidad || 0) * (item.precio || 0);
                      return (
                        <tr key={item.id || index} className="hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div className="flex items-center">
                              {item.producto?.imagenUrl && (
                                <img
                                  src={item.producto.imagenUrl}
                                  alt={item.producto.nombre || "Producto"}
                                  className="h-12 w-12 object-cover rounded-md mr-4"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                  }}
                                />
                              )}
                              <div>
                                <p className="font-medium text-gray-900">
                                  {item.producto?.nombre ||
                                    `Producto ${item.productoId.slice(-6)}`}
                                </p>
                                {item.producto?.categoria && (
                                  <p className="text-sm text-gray-500">
                                    {item.producto.categoria}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center text-sm text-gray-900">
                            {item.cantidad}
                          </td>
                          <td className="py-4 px-4 text-right text-sm text-gray-900">
                            {formatValue(item.precio)}
                          </td>
                          <td className="py-4 px-4 text-right text-sm font-medium text-gray-900">
                            {formatValue(subtotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200">
                      <td
                        colSpan={3}
                        className="py-4 px-4 text-right font-semibold"
                      >
                        Total:
                      </td>
                      <td className="py-4 px-4 text-right text-lg font-semibold text-green-600">
                        {formatValue(pedido.total || 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay productos en este pedido</p>
              </div>
            )}
          </div>

          {/* Historial de estados - CORREGIDO */}
          {pedido.estados && pedido.estados.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 text-purple-600 mr-2" />
                Historial de Estados
              </h3>

              <div className="relative">
                {/* Línea vertical */}
                <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200"></div>

                <div className="space-y-4">
                  {pedido.estados
                    .sort(
                      (a, b) =>
                        new Date(b.fechaEstado).getTime() -
                        new Date(a.fechaEstado).getTime()
                    )
                    .map((estado, index) => {
                      const esActual = index === 0;
                      const estadoInfo =
                        ESTADOS_PEDIDO[
                          estado.estado as keyof typeof ESTADOS_PEDIDO
                        ];

                      return (
                        <div
                          key={estado.id}
                          className="relative flex items-start"
                        >
                          {/* Dot */}
                          <div
                            className={`absolute left-2.5 w-3 h-3 rounded-full border-2 ${
                              esActual
                                ? "bg-blue-600 border-blue-600"
                                : "bg-white border-gray-400"
                            }`}
                          ></div>

                          {/* Content */}
                          <div className="ml-10 flex-1">
                            <div
                              className={`p-4 rounded-lg ${
                                esActual
                                  ? "bg-blue-50 border border-blue-200"
                                  : "bg-gray-50 border border-gray-200"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      estado.estado === "GENERADO"
                                        ? "bg-blue-100 text-blue-800"
                                        : estado.estado === "SEPARADO"
                                          ? "bg-yellow-100 text-yellow-800"
                                          : estado.estado === "FACTURADO"
                                            ? "bg-purple-100 text-purple-800"
                                            : estado.estado === "ENVIADO"
                                              ? "bg-orange-100 text-orange-800"
                                              : estado.estado === "ENTREGADO"
                                                ? "bg-green-100 text-green-800"
                                                : estado.estado === "CANCELADO"
                                                  ? "bg-red-100 text-red-800"
                                                  : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {estadoInfo?.label || estado.estado}
                                  </span>
                                  {esActual && (
                                    <span className="text-xs text-blue-600 font-medium">
                                      Estado actual
                                    </span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-600">
                                    {new Date(
                                      estado.fechaEstado
                                    ).toLocaleDateString("es-CO")}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(
                                      estado.fechaEstado
                                    ).toLocaleTimeString("es-CO")}
                                  </p>
                                </div>
                              </div>
                              {estadoInfo?.description && (
                                <p className="text-sm text-gray-600 mt-2">
                                  {estadoInfo.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { InvoiceDetailModal };
