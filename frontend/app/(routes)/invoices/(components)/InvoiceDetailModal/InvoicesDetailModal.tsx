// InvoiceDetailModal.tsx - ADAPTADO AL BACKEND EXISTENTE

"use client";

import React, { useState } from "react";
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

export function InvoiceDetailModal({
  pedido,
  isOpen,
  onClose,
  userType,
  onUpdate,
}: InvoiceDetailModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEstadoForm, setShowEstadoForm] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [guiaTransporte, setGuiaTransporte] = useState("");
  const [flete, setFlete] = useState("");

  const { getToken } = useAuth();
  const { toast } = useToast();

  if (!pedido) return null;

  // Obtener estado actual - manejar caso donde no hay estados
  let estadoActual = "GENERADO";
  if (
    pedido.estados &&
    Array.isArray(pedido.estados) &&
    pedido.estados.length > 0
  ) {
    const estadosOrdenados = pedido.estados.sort(
      (a, b) =>
        new Date(b.fechaEstado).getTime() - new Date(a.fechaEstado).getTime()
    );
    estadoActual = estadosOrdenados[0].estado;
  }

  const estadoInfo =
    ESTADOS_PEDIDO[estadoActual as keyof typeof ESTADOS_PEDIDO];
  const estadosSiguientes =
    ESTADOS_SIGUIENTES[estadoActual as keyof typeof ESTADOS_SIGUIENTES] || [];

  // Información del cliente - manejar casos donde puede no estar completa
  const nombreCliente =
    pedido.cliente?.rasonZocial ||
    `${pedido.cliente?.nombre || "Cliente"} ${pedido.cliente?.apellidos || ""}`.trim();

  // Calcular totales - manejar caso donde productos puede no existir
  const productos = pedido.productos || [];
  const totalItems = productos.reduce(
    (sum, item) => sum + (item.cantidad || 0),
    0
  );

  const getEstadoBadge = (estado: string) => {
    let badgeClass =
      "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ";

    switch (estado) {
      case "GENERADO":
        badgeClass += "bg-blue-100 text-blue-800";
        break;
      case "SEPARADO":
        badgeClass += "bg-yellow-100 text-yellow-800";
        break;
      case "FACTURADO":
        badgeClass += "bg-purple-100 text-purple-800";
        break;
      case "ENVIADO":
        badgeClass += "bg-orange-100 text-orange-800";
        break;
      case "ENTREGADO":
        badgeClass += "bg-green-100 text-green-800";
        break;
      case "CANCELADO":
        badgeClass += "bg-red-100 text-red-800";
        break;
      default:
        badgeClass += "bg-gray-100 text-gray-800";
    }

    return <span className={badgeClass}>{estadoInfo?.label || estado}</span>;
  };

  // ✅ FUNCIÓN ADAPTADA AL BACKEND EXISTENTE
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
        description:
          "La guía de transporte es requerida para el estado ENVIADO",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUpdating(true);
      const token = await getToken();

      // ✅ Preparar datos según la estructura que espera tu backend
      const datosExtra: any = {};

      if (nuevoEstado === "ENVIADO") {
        datosExtra.guiaTransporte = guiaTransporte;
        if (flete) {
          datosExtra.flete = parseFloat(flete);
        }
      }

      // ✅ Llamada adaptada a tu backend real
      await invoicesService.actualizarEstadoPedido(
        token!,
        pedido.id,
        nuevoEstado,
        datosExtra
      );

      // Crear el nuevo estado para actualizar la UI localmente
      const nuevoEstadoObj = {
        id: Date.now().toString(),
        estado: nuevoEstado as any,
        fechaEstado: new Date().toISOString(),
        pedidoId: pedido.id,
      };

      // Actualizar el pedido localmente
      const estadosActualizados = pedido.estados
        ? [...pedido.estados, nuevoEstadoObj]
        : [nuevoEstadoObj];

      const pedidoActualizado = {
        ...pedido,
        estados: estadosActualizados,
        ...(nuevoEstado === "ENVIADO" && {
          guiaTransporte,
          flete: flete ? parseFloat(flete) : undefined,
          fechaEnvio: new Date().toISOString(),
        }),
      };

      onUpdate(pedidoActualizado);
      setShowEstadoForm(false);
      setNuevoEstado("");
      setGuiaTransporte("");
      setFlete("");

      toast({
        title: "Estado actualizado",
        description: `El pedido ahora está en estado: ${ESTADOS_PEDIDO[nuevoEstado as keyof typeof ESTADOS_PEDIDO]?.label}`,
      });
    } catch (error: any) {
      console.error("Error al cambiar estado:", error);
      toast({
        title: "Error al cambiar estado",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Detalles del Pedido #{pedido.id.slice(-8).toUpperCase()}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Estado actual */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getEstadoBadge(estadoActual)}
                <span className="text-sm text-gray-600">
                  {estadoInfo?.description}
                </span>
              </div>

              {/* Botón cambiar estado (solo admin) */}
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
                  <Label className="text-sm font-medium text-gray-700">
                    Nuevo Estado
                  </Label>
                  <select
                    value={nuevoEstado}
                    onChange={(e) => setNuevoEstado(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
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

                {/* Campos adicionales para estado ENVIADO */}
                {nuevoEstado === "ENVIADO" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Guía de Transporte *
                      </Label>
                      <Input
                        value={guiaTransporte}
                        onChange={(e) => setGuiaTransporte(e.target.value)}
                        placeholder="Número de guía"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Valor del Flete
                      </Label>
                      <Input
                        type="number"
                        value={flete}
                        onChange={(e) => setFlete(e.target.value)}
                        placeholder="0"
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <Button
                    onClick={handleCambiarEstado}
                    disabled={isUpdating || !nuevoEstado}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    {isUpdating ? "Actualizando..." : "Confirmar"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowEstadoForm(false);
                      setNuevoEstado("");
                      setGuiaTransporte("");
                      setFlete("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
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
                  {pedido.cliente?.direccion && (
                    <div className="flex items-start text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-3 text-gray-400 mt-0.5" />
                      <span>{pedido.cliente.direccion}</span>
                    </div>
                  )}
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
                      ID del Pedido
                    </p>
                    <p className="font-mono text-sm">{pedido.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Vendedor
                    </p>
                    <p className="text-sm">
                      {pedido.usuario?.nombre || "No especificado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Fecha de Creación
                    </p>
                    <p className="text-sm">
                      {new Date(pedido.fechaPedido).toLocaleDateString("es-CO")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Total de Items
                    </p>
                    <p className="text-sm">{totalItems} productos</p>
                  </div>
                </div>

                {pedido.observaciones && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                      Observaciones
                    </p>
                    <div className="bg-gray-50 p-3 rounded text-sm text-gray-700">
                      {pedido.observaciones}
                    </div>
                  </div>
                )}

                {/* Información de envío */}
                {pedido.fechaEnvio && (
                  <div className="bg-orange-50 border border-orange-200 rounded p-4">
                    <h4 className="font-medium text-orange-900 mb-3 flex items-center">
                      <Truck className="h-4 w-4 mr-2" />
                      Información de Envío
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-orange-700">Fecha de envío:</span>
                        <span className="font-medium">
                          {new Date(pedido.fechaEnvio).toLocaleDateString(
                            "es-CO"
                          )}
                        </span>
                      </div>
                      {pedido.guiaTransporte && (
                        <div className="flex justify-between">
                          <span className="text-orange-700">
                            Guía de transporte:
                          </span>
                          <span className="font-medium">
                            {pedido.guiaTransporte}
                          </span>
                        </div>
                      )}
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
          </div>

          {/* Productos del pedido */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="h-5 w-5 text-orange-600 mr-2" />
              Productos del Pedido ({productos.length})
            </h3>

            {productos.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Producto
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cantidad
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Precio Unit.
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {productos.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <img
                              src={
                                item.producto?.imagenUrl ||
                                "/placeholder-product.png"
                              }
                              alt={item.producto?.nombre || "Producto"}
                              className="h-12 w-12 object-cover rounded-md mr-4"
                            />
                            <div>
                              <p className="font-medium text-gray-900">
                                {item.producto?.nombre || "Producto sin nombre"}
                              </p>
                              <p className="text-sm text-gray-500">
                                {item.producto?.categoria || "Sin categoría"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-900">
                          {item.cantidad}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-900">
                          {formatValue(item.precio)}
                        </td>
                        <td className="py-4 px-4 text-sm font-medium text-gray-900">
                          {formatValue(
                            (item.cantidad || 0) * (item.precio || 0)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No hay productos en este pedido
              </p>
            )}

            {/* Total */}
            <div className="mt-6 border-t border-gray-200 pt-4">
              <div className="flex justify-end">
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    Total:{" "}
                    <span className="text-green-600">
                      {formatValue(pedido.total || 0)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Historial de estados */}
          {pedido.estados && pedido.estados.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 text-purple-600 mr-2" />
                Historial de Estados
              </h3>

              <div className="space-y-3">
                {pedido.estados
                  .sort(
                    (a, b) =>
                      new Date(b.fechaEstado).getTime() -
                      new Date(a.fechaEstado).getTime()
                  )
                  .map((estado, index) => {
                    const esActual = index === 0;

                    return (
                      <div
                        key={estado.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          esActual
                            ? "bg-blue-50 border-blue-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              esActual ? "bg-blue-600" : "bg-gray-400"
                            }`}
                          />
                          {getEstadoBadge(estado.estado)}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            {new Date(estado.fechaEstado).toLocaleDateString(
                              "es-CO"
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(estado.fechaEstado).toLocaleTimeString(
                              "es-CO"
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
