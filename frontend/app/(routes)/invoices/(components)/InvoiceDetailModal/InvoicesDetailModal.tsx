// InvoiceDetailModal.tsx - SIN ESTADO ENTREGADO

"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, HomeIcon, Pencil, Save } from "lucide-react";

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
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { formatValue } from "@/utils/FormartValue";
import { invoicesService } from "../../services/invoices.service";
import type { Pedido } from "../../types/invoices.types";
import { ESTADOS_PEDIDO } from "../../types/invoices.types";
import { getEstadosSiguientes } from "../../types/invoices.types";

interface InvoiceDetailModalProps {
  pedido: Pedido | null;
  isOpen: boolean;
  onClose: () => void;
  userType: string;
  onUpdate: (pedidoActualizado: Pedido) => void;
}

// ✅ ESTADOS SIGUIENTES SIN ENTREGADO
const ESTADOS_SIGUIENTES = {
  GENERADO: ["SEPARADO"],
  SEPARADO: ["FACTURADO", "CANCELADO"],
  FACTURADO: ["ENVIADO", "CANCELADO"], // ✅ Puede ir a ENVIADO o CANCELADO
  ENVIADO: [], // ✅ CAMBIO: Ya no va a ENTREGADO, es estado final
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
  // ✨ NUEVO: edición directa de envío
  const [editEnvio, setEditEnvio] = useState(false);
  const [savingEnvio, setSavingEnvio] = useState(false);
  // ✅ NUEVO: Estado visual para bodegueros
  const [productosSeparados, setProductosSeparados] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && pedido) {
      setGuiaTransporte(pedido.guiaTransporte ?? "");
      setFlete(pedido.flete != null ? String(pedido.flete) : "");
    }
  }, [isOpen, pedido]);
  // resetea al abrir/cerrar y cuando cambia el pedido
  useEffect(() => {
    if (!isOpen) {
      setEditEnvio(false);
      setShowEstadoForm(false);
      setNuevoEstado("");
      return;
    }
    if (pedido) {
      setEditEnvio(false); // 👈 clave
      setShowEstadoForm(false);
      setNuevoEstado("");
      setGuiaTransporte(pedido.guiaTransporte ?? "");
      setFlete(pedido.flete != null ? String(pedido.flete) : "");
    }
  }, [isOpen, pedido?.id]);

  const { getToken } = useAuth();
  const { toast } = useToast();

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
  const estadosSiguientes = getEstadosSiguientes(estadoActual as any) || [];

  const handleCambiarEstado = async () => {
    if (nuevoEstado !== "GENERADO" && pedido) {
      localStorage.removeItem(`separados_${pedido.id}`);
      setProductosSeparados([]);
    }
    if (!nuevoEstado) {
      toast({
        title: "Error",
        description: "Selecciona un estado",
        variant: "destructive",
      });

      return;
    }

    // ✅ VALIDACIONES ACTUALIZADAS
    if (nuevoEstado === "ENVIADO" && !guiaTransporte.trim()) {
      toast({
        title: "Error",
        description: "La guía de transporte es requerida para enviar el pedido",
        variant: "destructive",
      });
      return;
    }

    // ✅ CONFIRMACIÓN ESPECIAL PARA CANCELADO
    if (nuevoEstado === "CANCELADO") {
      const confirmacion = window.confirm(
        "⚠️ ¿Estás seguro de cancelar este pedido?\n\n" +
          "Esta acción:\n" +
          "• Cambiará el estado a CANCELADO\n" +
          "• Retornará la mercancía al inventario\n" +
          "• Eliminará los movimientos de cartera\n" +
          "• NO se puede deshacer\n\n" +
          "¿Continuar?"
      );

      if (!confirmacion) return;
    }

    // ✅ CONFIRMACIÓN PARA ENVIADO (nuevo estado final)
    if (nuevoEstado === "ENVIADO") {
      const confirmacion = window.confirm(
        "🚚 ¿Confirmar envío del pedido?\n\n" +
          "Esta acción:\n" +
          "• Marcará el pedido como ENVIADO (estado final)\n" +
          "• Registrará la guía de transporte\n" +
          "• El pedido se considerará completado exitosamente\n" +
          "• Ya no podrá ser cancelado\n\n" +
          "¿Continuar?"
      );

      if (!confirmacion) return;
    }

    try {
      setIsUpdating(true);

      const token = await getToken();
      if (!token) {
        toast({
          title: "Error de autenticación",
          description: "No se pudo obtener el token de autenticación",
          variant: "destructive",
        });
        return;
      }

      // ✅ DATOS SEGÚN TU DTO CrearEstadoPedidoDto
      const datosActualizacion = {
        pedidoId: pedido.id,
        estado: nuevoEstado,
        guiaTransporte: guiaTransporte.trim() || undefined,
        flete: flete ? parseFloat(flete) : undefined,
      };

      // ✅ USAR EL ENDPOINT CORRECTO /pedidos/estado
      await invoicesService.actualizarEstadoPedido(
        token,
        pedido.id,
        datosActualizacion
      );

      // ✅ CREAR NUEVO ESTADO PARA ACTUALIZACIÓN LOCAL
      const estadosActuales = pedido.estados || [];
      const nuevoEstadoObj = {
        id: Date.now().toString(),
        estado: nuevoEstado as any,
        fechaEstado: new Date().toISOString(),
        pedidoId: pedido.id,
      };

      // ✅ ACTUALIZAR PEDIDO LOCAL
      const pedidoActualizado: Pedido = {
        ...pedido,
        guiaTransporte:
          nuevoEstado === "ENVIADO"
            ? guiaTransporte.trim() || pedido.guiaTransporte
            : pedido.guiaTransporte,
        flete:
          nuevoEstado === "ENVIADO"
            ? flete
              ? parseFloat(flete)
              : pedido.flete
            : pedido.flete,
        fechaEnvio:
          nuevoEstado === "ENVIADO"
            ? new Date().toISOString()
            : pedido.fechaEnvio,
        total: nuevoEstado === "CANCELADO" ? 0 : pedido.total, // ✅ El backend pone total en 0 al cancelar
        estados: [...estadosActuales, nuevoEstadoObj],
      };

      onUpdate(pedidoActualizado);

      // ✅ MENSAJES ESPECÍFICOS POR ESTADO - ACTUALIZADOS
      let mensaje = `Pedido cambiado a ${
        ESTADOS_PEDIDO[nuevoEstado as keyof typeof ESTADOS_PEDIDO]?.label
      }`;

      if (nuevoEstado === "FACTURADO") {
        mensaje += ". Stock descontado del inventario.";
      } else if (nuevoEstado === "CANCELADO") {
        mensaje += ". Mercancía retornada al inventario.";
      } else if (nuevoEstado === "ENVIADO") {
        mensaje += `. Pedido completado exitosamente. Guía: ${guiaTransporte}`;
      }

      toast({
        title: "✅ Estado actualizado",
        description: mensaje,
      });

      setShowEstadoForm(false);
      setNuevoEstado("");
      setGuiaTransporte("");
      setFlete("");
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

  // ✨ NUEVO: detectar si hay cambios en envío
  const envioChanged =
    guiaTransporte.trim() !== (pedido?.guiaTransporte ?? "").trim() ||
    (flete.trim() === "" ? null : Number(flete)) !== (pedido?.flete ?? null);
  // ---------- GUARDAR SOLO ENVÍO ----------
  const handleGuardarEnvio = async () => {
    try {
      setSavingEnvio(true);
      const token = await getToken();
      if (!token) {
        toast({
          title: "Error de autenticación",
          description: "No se pudo obtener el token",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        guiaTransporte: guiaTransporte.trim() || null,
        flete: flete.trim() === "" ? null : Number(flete),
      };
      if (estadoActual !== "ENVIADO") {
        toast({
          title: "No permitido",
          description: "Solo puedes editar envío cuando el pedido está ENVIADO",
          variant: "destructive",
        });
        return;
      }
      // ⬇️ Endpoint DEDICADO (impleméntalo en invoicesService)
      await invoicesService.actualizarEnvioPedido(token, pedido.id, payload);

      const pedidoActualizado: Pedido = {
        ...pedido,
        guiaTransporte: payload.guiaTransporte ?? undefined,
        flete: payload.flete ?? undefined,
        // fechaEnvio NO se toca aquí (la maneja el cambio de estado ENVIADO)
      };

      onUpdate(pedidoActualizado);
      setEditEnvio(false);

      toast({
        title: "✅ Envío actualizado",
        description: "Guía y/o flete guardados correctamente",
      });
    } catch (err: any) {
      console.error("❌ Error al actualizar envío:", err);
      toast({
        title: "Error",
        description:
          err?.message || "No se pudo actualizar la información de envío",
        variant: "destructive",
      });
    } finally {
      setSavingEnvio(false);
    }
  };

  const nombreCliente =
    pedido.cliente?.rasonZocial ||
    `${pedido.cliente?.nombre || "Cliente"} ${
      pedido.cliente?.apellidos || ""
    }`.trim();
  // ✅ NUEVO: Handler para marcar productos como separados
  const handleToggleSeparado = (productoId: string) => {
    setProductosSeparados((prev) => {
      const updated = prev.includes(productoId)
        ? prev.filter((id) => id !== productoId)
        : [...prev, productoId];
      if (pedido) {
        localStorage.setItem(`separados_${pedido.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const totalProductos = pedido.productos?.length || 0;
  const separados = productosSeparados.length;
  const progresoCompleto = separados === totalProductos && totalProductos > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Detalles del Pedido #{pedido.id.slice(0, 5).toUpperCase()}
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
                      ? "bg-green-100 text-green-800" // ✅ Verde para ENVIADO (exitoso)
                      : estadoActual === "CANCELADO"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {ESTADOS_PEDIDO[estadoActual as keyof typeof ESTADOS_PEDIDO]
                    ?.label || estadoActual}
                </span>

                {/* ✅ INDICADORES ESPECIALES */}
                {estadoActual === "CANCELADO" && (
                  <span className="text-sm text-red-600 font-medium">
                    Inventario restaurado
                  </span>
                )}
                {estadoActual === "ENVIADO" && (
                  <span className="text-sm text-green-600 font-medium flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Pedido completado
                  </span>
                )}
              </div>

              {(userType === "admin" || userType === "bodega") &&
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
          {showEstadoForm &&
            (userType === "admin" || userType === "bodega") && (
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
                            ESTADOS_PEDIDO[
                              estado as keyof typeof ESTADOS_PEDIDO
                            ]?.label
                          }
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ✅ ADVERTENCIA PARA CANCELADO */}
                  {nuevoEstado === "CANCELADO" && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex">
                        <AlertTriangle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-medium text-red-800">
                            ⚠️ Cancelación de Pedido
                          </h4>
                          <div className="text-sm text-red-700 mt-1 space-y-1">
                            <p>
                              • Se retornará toda la mercancía al inventario
                            </p>
                            <p>• Se eliminarán los movimientos de cartera</p>
                            <p>• El total del pedido se pondrá en $0</p>
                            <p>• Esta acción NO se puede deshacer</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ✅ ADVERTENCIA PARA ENVIADO (estado final) */}
                  {nuevoEstado === "ENVIADO" && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex">
                        <CheckCircle className="h-5 w-5 text-green-400 mr-2 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-medium text-green-800">
                            🚚 Envío del Pedido (Estado Final)
                          </h4>
                          <div className="text-sm text-green-700 mt-1 space-y-1">
                            <p>
                              • El pedido se marcará como completado
                              exitosamente
                            </p>
                            <p>• Ya no podrá ser cancelado después del envío</p>
                            <p>• Se registrará la guía de transporte</p>
                            <p>• Este es el estado final del pedido</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

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
                      className={
                        nuevoEstado === "CANCELADO"
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : nuevoEstado === "ENVIADO"
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }
                    >
                      {isUpdating
                        ? "Actualizando..."
                        : nuevoEstado === "CANCELADO"
                        ? "🗑️ Confirmar Cancelación"
                        : nuevoEstado === "ENVIADO"
                        ? "🚚 Confirmar Envío"
                        : "Confirmar"}
                    </Button>
                    <Button
                      variant="outline"
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
                  <HomeIcon className="h-4 w-4 mr-3 text-gray-400" />
                  <span>{pedido.cliente?.direccion || "No especificado"}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-3 text-gray-400" />
                  <span>{pedido.cliente?.ciudad || "No especificado"}-</span>
                  <span>
                    {pedido.cliente?.departamento || "No especificado"}
                  </span>
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
                    {pedido.usuario?.nombre || "No especificado"}
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
                  <p
                    className={`text-lg font-semibold ${
                      estadoActual === "CANCELADO"
                        ? "text-red-600"
                        : estadoActual === "ENVIADO"
                        ? "text-green-600"
                        : "text-blue-600"
                    }`}
                  >
                    {formatValue(pedido.total || 0)}
                    {estadoActual === "CANCELADO" && (
                      <span className="text-sm text-red-500 ml-2">
                        (Cancelado)
                      </span>
                    )}
                    {estadoActual === "ENVIADO" && (
                      <span className="text-sm text-green-500 ml-2">
                        (Completado)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {pedido.observaciones && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                    OBSERVACIONES
                  </p>

                  {(() => {
                    const texto = pedido.observaciones || "";
                    // Quita encabezado si existe
                    const sinTitulo = texto.replace(
                      /^OBSERVACIONES POR PRODUCTO:\s*/i,
                      ""
                    );

                    // 👇 Detecta logs de auditoría:
                    // - [AUDIT ...]
                    // - [dd/mm/aa, hh:mm] Estado ...
                    const auditRegex =
                      /\[(?:AUDIT|\d{2}\/\d{2}\/\d{2},\s*\d{2}:\d{2})\][^\[]*/g;
                    const audits = Array.from(
                      sinTitulo.matchAll(auditRegex)
                    ).map((m) => m[0].trim());

                    // Quita los audits del texto para que no "se peguen" a otras partes
                    const sinAudits = sinTitulo
                      .replace(auditRegex, "")
                      .replace(/\s+$/, "");

                    // Separa bloque general si lo usas
                    const [soloProductos, generalRaw] =
                      sinAudits.split(/OBSERVACIÓN GENERAL:/i);

                    // Ítems por producto (si usas viñetas "•")
                    const items = (soloProductos || "")
                      .split(/•\s*/)
                      .filter(Boolean)
                      .map((s) => s.trim());

                    // Mantén saltos de línea del bloque general
                    const generalClean = (generalRaw ?? "").replace(/\s+$/, "");
                    const hayGeneral =
                      generalClean.replace(/\s+/g, "").length > 0;

                    return (
                      <div className="bg-gray-50 p-3 rounded">
                        {items.length > 0 && (
                          <>
                            <p className="text-xs text-gray-500 mb-1">
                              Por producto
                            </p>
                            <ol className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                              {items.map((it, i) => (
                                <li key={i}>{it}</li>
                              ))}
                            </ol>
                          </>
                        )}

                        {hayGeneral && (
                          <>
                            <div className="h-3" />
                            <p className="text-xs text-gray-500 mb-1">
                              Observación general
                            </p>
                            <div className="text-sm text-gray-700 whitespace-pre-line">
                              {generalClean}
                            </div>
                          </>
                        )}

                        {audits.length > 0 && (
                          <>
                            <div className="h-3" />
                            <p className="text-xs text-gray-500 mb-1">
                              Auditoría
                            </p>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                              {audits.map((line, i) => (
                                <li key={i} className="whitespace-pre-wrap">
                                  {line}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ✨ Información de envío (EDITABLE) */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Truck className="h-5 w-5 text-green-600 mr-2" />
                  Información de Envío
                  {estadoActual === "ENVIADO" && (
                    <span className="ml-2 text-sm text-green-600">
                      (COMPLETADO)
                    </span>
                  )}
                  {(userType === "admin" || userType === "bodega") &&
                    estadoActual === "ENVIADO" &&
                    !editEnvio && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto flex items-center gap-2"
                        onClick={() => setEditEnvio(true)}
                      >
                        <Pencil className="w-4 h-4" />
                        Editar
                      </Button>
                    )}
                </h3>

                {editEnvio && estadoActual === "ENVIADO" ? (
                  // 👉 Formulario de edición (solo si ENVIADO + editEnvio = true)
                  <div className="bg-green-50 border border-green-200 rounded p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Guía de Transporte</Label>
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
                          inputMode="numeric"
                          value={flete}
                          onChange={(e) => setFlete(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={handleGuardarEnvio}
                        disabled={savingEnvio || !envioChanged}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                      >
                        {savingEnvio ? (
                          "Guardando..."
                        ) : (
                          <>
                            <Save className="w-4 h-4" /> Guardar
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setGuiaTransporte(pedido.guiaTransporte ?? "");
                          setFlete(
                            pedido.flete != null ? String(pedido.flete) : ""
                          );
                          setEditEnvio(false);
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  // 👉 Vista SOLO lectura (cuando no está en edición o no está ENVIADO)
                  <div className="space-y-2 text-sm">
                    {pedido.fechaEnvio && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fecha de envío:</span>
                        <span className="font-medium">
                          {new Date(pedido.fechaEnvio).toLocaleDateString(
                            "es-CO"
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Guía de transporte:</span>
                      <span className="font-medium">
                        {pedido.guiaTransporte || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Valor del flete:</span>
                      <span className="font-medium">
                        {pedido.flete != null ? formatValue(pedido.flete) : "—"}
                      </span>
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
              Productos del Pedido ({pedido.productos?.length || 0})
              {estadoActual === "CANCELADO" && (
                <span className="ml-2 text-sm text-red-600">
                  (Inventario restaurado)
                </span>
              )}
              {estadoActual === "ENVIADO" && (
                <span className="ml-2 text-sm text-green-600">
                  (Enviado exitosamente)
                </span>
              )}
            </h3>
            {estadoActual === "GENERADO" && totalProductos > 0 && (
              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">
                    {separados} de {totalProductos} productos separados
                  </span>
                  {progresoCompleto && (
                    <span className="text-green-600 text-sm font-semibold flex items-center">
                      <Check className="w-4 h-4 mr-1" /> ¡Completo!
                    </span>
                  )}
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${(separados / totalProductos) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

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
                      {estadoActual === "GENERADO" && (
                        <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Separado
                        </th>
                      )}
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
                                    `Producto ${item.productoId.slice(5)}`}
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
                          {estadoActual === "GENERADO" && (
                            <td className="py-4 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={productosSeparados.includes(
                                  item.productoId
                                )}
                                onChange={() =>
                                  handleToggleSeparado(item.productoId)
                                }
                                className="w-5 h-5 accent-green-600 cursor-pointer"
                              />
                            </td>
                          )}
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
                      <td
                        className={`py-4 px-4 text-right text-lg font-semibold ${
                          estadoActual === "CANCELADO"
                            ? "text-red-600"
                            : estadoActual === "ENVIADO"
                            ? "text-green-600"
                            : "text-blue-600"
                        }`}
                      >
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

          {/* Historial de estados */}
          {pedido.estados && pedido.estados.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 text-purple-600 mr-2" />
                Historial de Estados
              </h3>

              <div className="relative">
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
                          <div
                            className={`absolute left-2.5 w-3 h-3 rounded-full border-2 ${
                              esActual
                                ? estado.estado === "CANCELADO"
                                  ? "bg-red-600 border-red-600"
                                  : estado.estado === "ENVIADO"
                                  ? "bg-green-600 border-green-600"
                                  : "bg-blue-600 border-blue-600"
                                : "bg-white border-gray-400"
                            }`}
                          ></div>

                          <div className="ml-10 flex-1">
                            <div
                              className={`p-4 rounded-lg ${
                                esActual
                                  ? estado.estado === "CANCELADO"
                                    ? "bg-red-50 border border-red-200"
                                    : estado.estado === "ENVIADO"
                                    ? "bg-green-50 border border-green-200"
                                    : "bg-blue-50 border border-blue-200"
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
                                        ? "bg-green-100 text-green-800"
                                        : estado.estado === "CANCELADO"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {estadoInfo?.label || estado.estado}
                                  </span>
                                  {esActual && (
                                    <span
                                      className={`text-xs font-medium ${
                                        estado.estado === "CANCELADO"
                                          ? "text-red-600"
                                          : estado.estado === "ENVIADO"
                                          ? "text-green-600"
                                          : "text-blue-600"
                                      }`}
                                    >
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
                                  {estado.estado === "CANCELADO" &&
                                    " - Inventario restaurado"}
                                  {estado.estado === "ENVIADO" &&
                                    " - Pedido completado exitosamente"}
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
