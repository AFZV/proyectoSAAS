// app/invoices/(components)/InvoicesClient/InvoicesClient.tsx - SIN ESTADO ENTREGADO

"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Search,
  Plus,
  MoreHorizontal,
  Edit3,
  Eye,
  Truck,
  Phone,
  MapPin,
  Calendar,
  User,
  Building,
  DollarSign,
  Grid3X3,
  List,
  Maximize2,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Columns,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { formatValue } from "@/utils/FormartValue";
import { ESTADOS_PEDIDO } from "../../types/invoices.types";
import { invoicesService } from "../../services/invoices.service";
import { InvoiceDetailModal } from "../InvoiceDetailModal";
import { EditPedidoModal } from "../EditPedidoModal";
import type { Pedido } from "../../types/invoices.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface InvoicesClientProps {
  pedidos: Pedido[];
  userType: string;
  userName: string;
  estadisticas?: {
    totalPedidos: number;
    pedidosPorEstado: Record<string, number>;
    ventasTotal: number;
    ventasHoy: number;
    pedidosHoy?: number;
  } | null;
}

type ViewMode = "compact" | "cards" | "full-table";

export function InvoicesClient({
  pedidos: pedidosIniciales,
  userType,
  userName,
  estadisticas,
}: InvoicesClientProps) {
  // Estados principales
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciales);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Vista de tabla
  const [viewMode, setViewMode] = useState<ViewMode>("compact");

  // Columnas visibles (para vista completa)
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    cliente: true,
    contacto: false,
    total: true,
    estado: true,
    vendedor: false,
    fecha: false,
    flete: false,
    guiaTransporte: false,
    acciones: true,
  });

  const { getToken } = useAuth();
  const { toast } = useToast();

  // Funciones helper
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

  const getNombreCliente = (pedido: Pedido): string => {
    if (!pedido?.cliente) {
      return `Cliente ID: ${pedido?.clienteId?.slice(0, 5) ?? ""}`;
    }

    const razon = pedido.cliente.rasonZocial?.trim();
    const nombreCompleto = `${pedido.cliente.nombre ?? ""} ${
      pedido.cliente.apellidos ?? ""
    }`.trim();

    if (razon && nombreCompleto) {
      // Muestra ambas: razón social y abajo nombre completo
      return `${razon}\n${nombreCompleto}`;
    }

    // Si solo hay una de las dos, muestra la disponible
    return (
      razon || nombreCompleto || `Cliente ID: ${pedido.clienteId.slice(0, 5)}`
    );
  };

  const getNombreVendedor = (pedido: Pedido): string => {
    if (!pedido.usuario) {
      return `Usuario ID: ${pedido.usuarioId.slice(0, 5)}`;
    }
    return `${pedido.usuario.nombre || "Usuario"} ${
      pedido.usuario.apellidos || ""
    }`.trim();
  };

  // Filtrar pedidos
  const pedidosFiltrados = useMemo(() => {
    let filtered = pedidos;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((pedido) => {
        const nombreCliente = getNombreCliente(pedido).toLowerCase();
        const nombreVendedor = getNombreVendedor(pedido).toLowerCase();
        const idPedido = pedido.id.toLowerCase();

        return (
          idPedido.includes(term) ||
          nombreCliente.includes(term) ||
          nombreVendedor.includes(term) ||
          (pedido.cliente?.correo || "").toLowerCase().includes(term) ||
          (pedido.cliente?.telefono || "").includes(term) ||
          (pedido.cliente?.nit || "").toLowerCase().includes(term)
        );
      });
    }

    if (estadoFiltro !== "todos") {
      filtered = filtered.filter((pedido) => {
        const estadoActual = getEstadoActual(pedido);
        return estadoActual === estadoFiltro;
      });
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.fechaPedido).getTime() - new Date(a.fechaPedido).getTime()
    );
  }, [pedidos, searchTerm, estadoFiltro]);

  // Paginación
  const totalPages = Math.ceil(pedidosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pedidosPaginados = pedidosFiltrados.slice(startIndex, endIndex);

  const getEstadoBadge = (estado: string) => {
    const estadoInfo = ESTADOS_PEDIDO[estado as keyof typeof ESTADOS_PEDIDO];
    let badgeClass =
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";

    switch (estado) {
      case "GENERADO":
        badgeClass += " bg-blue-100 text-blue-800";
        break;
      case "ACEPTADO":
        badgeClass += " bg-green-200 text-green-800"; // ✅ Verde oscuro para ACEPTADO
        break;
      case "SEPARADO":
        badgeClass += " bg-yellow-100 text-yellow-800";
        break;
      case "FACTURADO":
        badgeClass += " bg-purple-100 text-purple-800";
        break;
      case "ENVIADO":
        badgeClass += " bg-green-100 text-green-800"; // ✅ Verde para ENVIADO (estado final exitoso)
        break;
      case "CANCELADO":
        badgeClass += " bg-red-100 text-red-800";
        break;
      default:
        badgeClass += " bg-gray-100 text-gray-800";
    }

    return <span className={badgeClass}>{estadoInfo?.label || estado}</span>;
  };

  const handleVerDetalle = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setIsDetailModalOpen(true);
  };

  const handleEditarPedido = (pedido: Pedido) => {
    if (pedido) {
      setSelectedPedido(pedido);
      setIsEditModalOpen(true);
    }
    return;
  };

  const handleDescargarPdf = async (pedido: Pedido) => {
    try {
      const urlConTimestamp = `${pedido.pdfUrl}?t=${Date.now()}`;

      // Descarga el archivo como blob para evitar que el navegador lo abra
      const response = await fetch(urlConTimestamp);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `pedido_${pedido.id.slice(0, 5)}.pdf`; // ✅ Nombre del archivo descargado
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url); // ✅ Limpieza
      document.body.removeChild(a);

      toast({
        title: "PDF descargado",
        description: "El comprobante ha sido descargado exitosamente",
      });
    } catch (error) {
      console.error("Error al descargar PDF:", error);
      toast({
        title: "Error al descargar",
        description: "No se pudo descargar el PDF",
        variant: "destructive",
      });
    }
  };

  // Función para refrescar datos
  const refreshPedidos = async () => {
    try {
      setIsRefreshing(true);
      const token = await getToken();
      const pedidosActualizados = await invoicesService.obtenerPedidos(token!);
      setPedidos(pedidosActualizados);

      toast({
        title: "Datos actualizados",
        description: "La lista de pedidos se ha actualizado correctamente",
      });
    } catch (error) {
      console.error("Error al refrescar pedidos:", error);
      toast({
        title: "Error al actualizar",
        description: "No se pudieron actualizar los datos",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Manejar actualización de pedido
  const handleUpdatePedido = async (pedidoActualizado: Pedido) => {
    setPedidos((prev) =>
      prev.map((p) => (p.id === pedidoActualizado.id ? pedidoActualizado : p))
    );
    setSelectedPedido(pedidoActualizado);

    setTimeout(() => {
      refreshPedidos();
    }, 1000);
  };

  //helpers
  // Devuelve la fecha (ISO string) del primer/último estado FACTURADO.
  // Puedes elegir "primero" (el más viejo) o "último" (el más reciente).
  const getFechaEstado = (
    pedido: Pedido,
    estadoBuscado: string,
    modo: "primero" | "ultimo" = "ultimo"
  ): string | null => {
    if (!pedido?.estados?.length) return null;
    const coincidencias = pedido.estados
      .filter((e) => e.estado === estadoBuscado && e.fechaEstado)
      .sort(
        (a, b) =>
          new Date(a.fechaEstado).getTime() - new Date(b.fechaEstado).getTime()
      ); // asc

    if (coincidencias.length === 0) return null;
    return modo === "primero"
      ? coincidencias[0].fechaEstado
      : coincidencias[coincidencias.length - 1].fechaEstado;
  };

  // Fecha que quieres mostrar bajo el badge de estado:
  // - Si existe FACTURADO → usa esa fecha
  // - Si no, cae a fechaPedido
  const getFechaParaMostrar = (pedido: Pedido): string => {
    const fFacturado = getFechaEstado(pedido, "FACTURADO", "ultimo");
    return (fFacturado ?? pedido.fechaPedido) as string;
  };

  // VISTA COMPACTA - Solo información esencial
  const renderCompactView = () => (
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
          {pedidosPaginados.map((pedido) => {
            const estadoActual = getEstadoActual(pedido);
            const nombreCliente = getNombreCliente(pedido);

            return (
              <div
                key={pedido.id}
                className="px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleVerDetalle(pedido)}
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

                  {/* Estado */}
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
                  </div>

                  {/* Acciones */}
                  <div className="col-span-2">
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVerDetalle(pedido);
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {(userType === "admin" || userType === "bodega") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditarPedido(pedido);
                          }}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      )}
                      {["admin", "vendedor"].includes(userType) &&
                        [
                          "GENERADO",
                          "SEPARADO",
                          "FACTURADO",
                          "ENVIADO",
                        ].includes(estadoActual) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDescargarPdf(pedido);
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
                        <MoreHorizontal className="h-4 w-4" />
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

  // VISTA DE TARJETAS
  const renderCardsView = () => (
    <div className="grid gap-4 p-4">
      {pedidosPaginados.map((pedido) => {
        const estadoActual = getEstadoActual(pedido);
        const nombreCliente = getNombreCliente(pedido);
        const nombreVendedor = getNombreVendedor(pedido);

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
                  <div className="flex items-center space-x-2">
                    {getEstadoBadge(estadoActual)}
                    {estadoActual === "ENVIADO" && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
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
                  {estadoActual === "ENVIADO" && (
                    <span className="text-sm text-green-500 ml-2">
                      ✓ Completado
                    </span>
                  )}
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
                  onClick={() => handleVerDetalle(pedido)}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver Detalles
                </Button>
                {userType === "admin" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditarPedido(pedido)}
                    className="text-gray-600 hover:bg-gray-50"
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                )}
                {["admin", "vendedor"].includes(userType) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDescargarPdf(pedido);
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

  // TABLA COMPLETA con scroll horizontal optimizado
  const renderFullTableView = () => (
    <div className="relative">
      {/* Indicadores de scroll */}
      <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
        <span className="flex items-center">
          <ArrowLeft className="h-3 w-3 mr-1" />
          Desliza horizontalmente para ver más columnas
          <ArrowRight className="h-3 w-3 ml-1" />
        </span>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns className="h-4 w-4 mr-2" />
              Configurar Columnas
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Seleccionar Columnas Visibles</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              {Object.entries(visibleColumns).map(([key, visible]) => (
                <div key={key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={key}
                    checked={visible}
                    onChange={(e) =>
                      setVisibleColumns((prev) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-300"
                  />
                  <label
                    htmlFor={key}
                    className="text-sm font-medium capitalize"
                  >
                    {key === "id"
                      ? "ID"
                      : key === "contacto"
                      ? "Contacto"
                      : key}
                  </label>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabla con scroll horizontal suave */}
      <div className="overflow-x-auto">
        <table
          className="min-w-full divide-y divide-gray-200"
          style={{ minWidth: "800px" }}
        >
          <thead className="bg-gray-50">
            <tr>
              {visibleColumns.id && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                  ID
                </th>
              )}
              {visibleColumns.cliente && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                  Cliente
                </th>
              )}
              {visibleColumns.contacto && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Contacto
                </th>
              )}
              {visibleColumns.total && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Total
                </th>
              )}
              {visibleColumns.estado && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Estado
                </th>
              )}
              {visibleColumns.vendedor && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Vendedor
                </th>
              )}
              {visibleColumns.fecha && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Fecha
                </th>
              )}
              {visibleColumns.flete && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Flete
                </th>
              )}
              {visibleColumns.guiaTransporte && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Guía
                </th>
              )}
              {visibleColumns.acciones && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] sticky right-0 bg-gray-50">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pedidosPaginados.map((pedido) => {
              const estadoActual = getEstadoActual(pedido);
              const nombreCliente = getNombreCliente(pedido);
              const nombreVendedor = getNombreVendedor(pedido);

              return (
                <tr key={pedido.id} className="hover:bg-gray-50">
                  {visibleColumns.id && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                      #{pedido.id.slice(0, 5).toUpperCase()}
                    </td>
                  )}
                  {visibleColumns.cliente && (
                    <td className="px-6 py-4">
                      <div className="max-w-[200px]">
                        <div className="text-sm font-medium text-gray-900 break-words">
                          {pedido.cliente?.rasonZocial}
                        </div>
                        <div className="text-sm text-gray-700 -mt-0.5 break-words">
                          {(pedido.cliente?.nombre ?? "") +
                            " " +
                            (pedido.cliente?.apellidos ?? "")}
                        </div>

                        <div className="text-sm text-gray-500 truncate mt-0.5">
                          {pedido.cliente?.nit
                            ? `NIT: ${pedido.cliente.nit}`
                            : "Sin NIT"}
                        </div>
                      </div>
                    </td>
                  )}
                  {visibleColumns.contacto && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {pedido.cliente?.telefono || "Sin teléfono"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {pedido.cliente?.ciudad || "Sin ciudad"}
                      </div>
                    </td>
                  )}
                  {visibleColumns.total && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatValue(pedido.total || 0)}
                    </td>
                  )}
                  {visibleColumns.estado && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getEstadoBadge(estadoActual)}
                        {estadoActual === "ENVIADO" && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </td>
                  )}
                  {visibleColumns.vendedor && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                          <span className="text-xs font-medium text-blue-600">
                            {(pedido.usuario?.nombre || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm text-gray-900 truncate max-w-[100px]">
                          {nombreVendedor}
                        </span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.fecha && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(getFechaParaMostrar(pedido)).toLocaleDateString(
                        "es-CO"
                      )}
                    </td>
                  )}
                  {visibleColumns.flete && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {pedido.flete ? (
                        <span
                          className={`text-sm font-medium ${
                            estadoActual === "ENVIADO"
                              ? "text-green-600"
                              : "text-orange-600"
                          }`}
                        >
                          {formatValue(pedido.flete)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.guiaTransporte && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {pedido.guiaTransporte ? (
                        <div className="flex items-center space-x-1">
                          <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            {pedido.guiaTransporte}
                          </span>
                          {estadoActual === "ENVIADO" && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.acciones && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 sticky right-0 bg-white">
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerDetalle(pedido)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {userType === "admin" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditarPedido(pedido)}
                            className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        )}
                        {userType === "admin" &&
                          ["FACTURADO", "ENVIADO"].includes(estadoActual) && ( // ✅ QUITADO ENTREGADO
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDescargarPdf(pedido)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Descargar comprobante PDF"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ✅ Calcular estadísticas sin ENTREGADO
  const stats = useMemo(() => {
    if (estadisticas) {
      return {
        totalPedidos: estadisticas.totalPedidos,
        pedidosActivos: Object.entries(estadisticas.pedidosPorEstado)
          .filter(
            ([estado]) =>
              ![
                "SEPARADO",
                "CANCELADO",
                "ENVIADO",
                "SEPARADO",
                "FACTURADO",
              ].includes(estado)
          ) // ✅ ENVIADO ya no es activo
          .reduce((sum, [, count]) => sum + count, 0),
        pedidosCompletados: estadisticas.pedidosPorEstado.ENVIADO || 0, // ✅ ENVIADO = completados
        pedidosCancelados: estadisticas.pedidosPorEstado.CANCELADO || 0,
        pedidosSeparados: estadisticas.pedidosPorEstado.SEPARADO || 0,
        pedidosGenerados: estadisticas.pedidosPorEstado.GENERADO || 0,
        pedidosFacturados: estadisticas.pedidosPorEstado.FACTURADO || 0,
      };
    }

    const totalPedidos = pedidosFiltrados.length;
    const pedidosGenerados = pedidosFiltrados.filter((p) => {
      const estado = getEstadoActual(p);
      return estado === "GENERADO";
    }).length;
    const pedidosCompletados = pedidosFiltrados.filter((p) => {
      const estado = getEstadoActual(p);
      return estado === "ENVIADO"; // ✅ ENVIADO = completados
    }).length;
    const pedidosCancelados = pedidosFiltrados.filter((p) => {
      const estado = getEstadoActual(p);
      return estado === "CANCELADO";
    }).length;
    const pedidosSeparados = pedidosFiltrados.filter((p) => {
      const estado = getEstadoActual(p);
      return estado === "SEPARADO";
    }).length;
    const pedidosFacturados = pedidosFiltrados.filter((p) => {
      const estado = getEstadoActual(p);
      return estado === "FACTURADO";
    }).length;

    return {
      totalPedidos,
      pedidosGenerados,
      pedidosFacturados,
      pedidosCompletados,
      pedidosCancelados,
      pedidosSeparados,
    };
  }, [pedidosFiltrados, estadisticas]);

  return (
    <div className="p-4 lg:p-6">
      {/* Header - Responsive optimizado */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl lg:rounded-2xl p-4 lg:p-8 mb-6 lg:mb-8 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
          <div className="flex items-center space-x-3 lg:space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-2 lg:p-3 rounded-lg lg:rounded-xl">
              <FileText className="h-5 w-5 lg:h-8 lg:w-8 text-white" />
            </div>
            <div>
              <h1 className="text-lg lg:text-2xl font-bold text-white">
                PEDIDOS
              </h1>
              <p className="text-blue-100 text-xs lg:text-sm">
                Gestiona tus pedidos
              </p>
            </div>
          </div>
          <div className="flex flex-col space-y-2 lg:flex-row lg:space-y-0 lg:space-x-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={refreshPedidos}
              disabled={isRefreshing}
              className="bg-white/10 text-white hover:bg-white/20 border-white/20 backdrop-blur-sm text-xs lg:text-sm"
            >
              <RefreshCw
                className={`h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              {isRefreshing ? "Actualizando..." : "Actualizar"}
            </Button>
            <Button
              size="sm"
              onClick={() => (window.location.href = "/catalog")}
              className="bg-white text-blue-600 hover:bg-blue-50 font-medium text-xs lg:text-sm"
            >
              <Plus className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
              Crear Pedido
            </Button>
          </div>
        </div>
      </div>

      {/* ✅ Stats Cards actualizadas - Responsive mejorado */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
        <div className="bg-white rounded-xl p-3 lg:p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl lg:text-3xl font-bold text-gray-900">
                {stats.totalPedidos}
              </p>
              <p className="text-xs lg:text-sm text-gray-500 font-medium">
                Total
              </p>
            </div>
            <div className="bg-blue-100 p-2 lg:p-4 rounded-xl">
              <div className="w-3 h-3 lg:w-6 lg:h-6 bg-blue-600 rounded-lg"></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 lg:p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl lg:text-3xl font-bold text-gray-900">
                {stats.pedidosGenerados}
              </p>
              <p className="text-xs lg:text-sm text-gray-500 font-medium">
                Generados
              </p>
            </div>
            <div className="bg-blue-100 p-2 lg:p-4 rounded-xl">
              <div className="w-3 h-3 lg:w-6 lg:h-6 bg-blue-600 rounded-lg"></div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 lg:p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl lg:text-3xl font-bold text-gray-900">
                {stats.pedidosSeparados}
              </p>
              <p className="text-xs lg:text-sm text-gray-500 font-medium">
                Separados
              </p>
            </div>
            <div className="bg-yellow-100 p-2 lg:p-4 rounded-xl">
              <div className="w-3 h-3 lg:w-6 lg:h-6 bg-yellow-600 rounded-lg"></div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 lg:p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl lg:text-3xl font-bold text-gray-900">
                {stats.pedidosFacturados}
              </p>
              <p className="text-xs lg:text-sm text-gray-500 font-medium">
                Facturados
              </p>
            </div>
            <div className="bg-green-100 p-2 lg:p-4 rounded-xl">
              <FileText className="w-3 h-3 lg:w-6 lg:h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 lg:p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl lg:text-3xl font-bold text-gray-900">
                {stats.pedidosCompletados}
              </p>
              <p className="text-xs lg:text-sm text-gray-500 font-medium">
                Enviados ✓
              </p>
            </div>
            <div className="bg-green-100 p-2 lg:p-4 rounded-xl">
              <CheckCircle className="w-3 h-3 lg:w-6 lg:h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 lg:p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl lg:text-3xl font-bold text-gray-900">
                {stats.pedidosCancelados}
              </p>
              <p className="text-xs lg:text-sm text-gray-500 font-medium">
                Cancelados
              </p>
            </div>
            <div className="bg-red-100 p-2 lg:p-4 rounded-xl">
              <div className="w-3 h-3 lg:w-6 lg:h-6 bg-red-600 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección de pedidos */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 lg:p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <h2 className="text-lg lg:text-xl font-semibold text-gray-900">
              Lista de Pedidos
            </h2>

            <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:space-y-0 lg:space-x-3">
              {/* Búsqueda */}
              <div className="relative flex-1 lg:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar pedidos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full lg:w-64"
                />
              </div>

              {/* Fila inferior en móviles: Filtro + Vista */}
              <div className="flex space-x-3">
                {/* Filtro de estado */}
                <select
                  value={estadoFiltro}
                  onChange={(e) => setEstadoFiltro(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white lg:flex-initial lg:min-w-[140px]"
                >
                  <option value="todos">Todos</option>
                  {Object.entries(ESTADOS_PEDIDO).map(([key, estado]) => (
                    <option key={key} value={key}>
                      {estado.label}
                    </option>
                  ))}
                </select>

                {/* Selector de vista - Responsive optimizado */}
                <div className="flex bg-gray-100 rounded-lg p-1 shrink-0">
                  <Button
                    variant={viewMode === "compact" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("compact")}
                    className="rounded-r-none px-2 lg:px-3"
                    title="Vista Compacta"
                  >
                    <List className="h-4 w-4" />
                    <span className="ml-1 hidden md:inline lg:inline">
                      Compacta
                    </span>
                  </Button>
                  <Button
                    variant={viewMode === "cards" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("cards")}
                    className="rounded-none px-2 lg:px-3"
                    title="Vista Tarjetas"
                  >
                    <Grid3X3 className="h-4 w-4" />
                    <span className="ml-1 hidden md:inline lg:inline">
                      Tarjetas
                    </span>
                  </Button>
                  <Button
                    variant={viewMode === "full-table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("full-table")}
                    className="rounded-l-none px-2 lg:px-3"
                    title="Vista Completa"
                  >
                    <Maximize2 className="h-4 w-4" />
                    <span className="ml-1 hidden md:inline lg:inline">
                      Completa
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido según la vista seleccionada */}
        {pedidosPaginados.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay pedidos
            </h3>
            <p className="text-gray-500 mb-4">
              {pedidos.length === 0
                ? "Aún no se han creado pedidos."
                : "No se encontraron pedidos con los filtros aplicados."}
            </p>
            <Button
              onClick={() => (window.location.href = "/catalog")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Pedido
            </Button>
          </div>
        ) : (
          <>
            {viewMode === "compact" && renderCompactView()}
            {viewMode === "cards" && renderCardsView()}
            {viewMode === "full-table" && renderFullTableView()}
          </>
        )}

        {/* Paginación - Responsive mejorada */}
        {pedidosFiltrados.length > 0 && (
          <div className="bg-white px-3 lg:px-6 py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              <div className="text-xs lg:text-sm text-gray-700 text-center lg:text-left">
                <span className="hidden lg:inline">Mostrando </span>
                <span className="font-medium">{startIndex + 1}</span>
                <span className="hidden lg:inline"> a </span>
                <span className="lg:hidden">-</span>
                <span className="font-medium">
                  {Math.min(endIndex, pedidosFiltrados.length)}
                </span>
                <span className="hidden lg:inline"> de </span>
                <span className="lg:hidden">/</span>
                <span className="font-medium">{pedidosFiltrados.length}</span>
                <span className="hidden lg:inline"> elementos</span>
              </div>

              <div className="flex items-center justify-center space-x-1 lg:space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-2 lg:px-3"
                >
                  <span className="hidden lg:inline">Anterior</span>
                  <span className="lg:hidden">‹</span>
                </Button>

                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                    const pageNumber =
                      currentPage <= 2 ? i + 1 : currentPage - 1 + i;
                    if (pageNumber > totalPages) return null;

                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`px-2 lg:px-3 py-1 rounded text-xs lg:text-sm ${
                          currentPage === pageNumber
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-2 lg:px-3"
                >
                  <span className="hidden lg:inline">Siguiente</span>
                  <span className="lg:hidden">›</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ Información actualizada - Responsive */}
      <div className="mt-6 p-3 lg:p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex">
          <AlertCircle className="h-4 w-4 lg:h-5 lg:w-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Información - Flujo sin ENTREGADO
            </h3>
            <div className="text-xs lg:text-sm text-blue-700 space-y-1">
              <p>• **ENVIADO es ahora el estado final exitoso** ✓</p>
              <p>• Solo se puede editar en GENERADO o SEPARADO</p>
              <p className="hidden lg:block">
                • El botón PDF aparece desde FACTURADO y ENVIADO
              </p>
              <p>• Los pedidos ENVIADOS no pueden cancelarse</p>
              <p className="hidden lg:block">
                • Los cambios se sincronizan automáticamente
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}
      <InvoiceDetailModal
        pedido={selectedPedido}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedPedido(null);
        }}
        userType={userType}
        onUpdate={handleUpdatePedido}
      />

      <EditPedidoModal
        pedido={selectedPedido}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPedido(null);
        }}
        onSuccess={refreshPedidos}
      />
    </div>
  );
}
