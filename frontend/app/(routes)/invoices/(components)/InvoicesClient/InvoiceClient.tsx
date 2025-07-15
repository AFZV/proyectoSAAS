// app/invoices/(components)/InvoicesClient/InvoicesClient.tsx

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
    if (!pedido.cliente) {
      return `Cliente ID: ${pedido.clienteId.slice(-8)}`;
    }
    return (
      pedido.cliente.rasonZocial ||
      `${pedido.cliente.nombre || "Cliente"} ${
        pedido.cliente.apellidos || ""
      }`.trim()
    );
  };

  const getNombreVendedor = (pedido: Pedido): string => {
    if (!pedido.usuario) {
      return `Usuario ID: ${pedido.usuarioId.slice(-8)}`;
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
      case "SEPARADO":
        badgeClass += " bg-yellow-100 text-yellow-800";
        break;
      case "FACTURADO":
        badgeClass += " bg-purple-100 text-purple-800";
        break;
      case "ENVIADO":
        badgeClass += " bg-orange-100 text-orange-800";
        break;
      case "ENTREGADO":
        badgeClass += " bg-green-100 text-green-800";
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
    const estadoActual = getEstadoActual(pedido);
    if (!["GENERADO", "SEPARADO"].includes(estadoActual)) {
      toast({
        title: "No se puede editar",
        description: `Los pedidos en estado ${
          ESTADOS_PEDIDO[estadoActual as keyof typeof ESTADOS_PEDIDO]?.label
        } no pueden ser modificados`,
        variant: "destructive",
      });
      return;
    }

    setSelectedPedido(pedido);
    setIsEditModalOpen(true);
  };

  const handleDescargarPdf = async (pedido: Pedido) => {
    try {
      const token = await getToken();

      // Opción 1: Si existe pdfUrl, abrir directamente
      if (pedido.pdfUrl) {
        window.open(pedido.pdfUrl, "_blank");
        toast({
          title: "PDF abierto",
          description: "El comprobante se ha abierto en una nueva pestaña",
        });
        return;
      }

      // Opción 2: Si no existe pdfUrl, generar desde el backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/pedidos/${pedido.id}/pdf`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Error al generar PDF");
      }

      // Crear blob y descargar
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pedido_${pedido.id.slice(-8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "PDF descargado",
        description: "El comprobante ha sido descargado exitosamente",
      });
    } catch (error) {
      console.error("Error al descargar PDF:", error);
      toast({
        title: "Error al descargar",
        description: "No se pudo generar el PDF del pedido",
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
            const puedeEditar = ["GENERADO", "SEPARADO"].includes(estadoActual);

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
                      #{pedido.id.slice(-6).toUpperCase()}
                    </span>
                  </div>

                  {/* Cliente */}
                  <div className="col-span-4 min-w-0">
                    <div className="truncate">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {nombreCliente}
                      </p>
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
                    {getEstadoBadge(estadoActual)}
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(pedido.fechaPedido).toLocaleDateString(
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
                      {userType === "admin" && puedeEditar && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditarPedido(pedido);
                          }}
                          className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 p-1"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      )}
                      {userType === "admin" &&
                        ["FACTURADO", "ENVIADO", "ENTREGADO"].includes(
                          estadoActual
                        ) && (
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
        const puedeEditar = ["GENERADO", "SEPARADO"].includes(estadoActual);

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
                    #{pedido.id.slice(-8).toUpperCase()}
                  </span>
                  {getEstadoBadge(estadoActual)}
                </div>
                <div className="text-lg font-bold text-gray-900">
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
                    <h3 className="font-medium text-gray-900 mb-1">
                      {nombreCliente}
                    </h3>
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
                      {new Date(pedido.fechaPedido).toLocaleDateString("es-CO")}
                    </span>
                  </div>

                  {(pedido.flete || pedido.guiaTransporte) && (
                    <div className="space-y-1">
                      {pedido.flete && (
                        <div className="flex items-center space-x-2">
                          <Truck className="h-4 w-4 text-orange-500" />
                          <span className="text-sm font-medium text-orange-600">
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
                {userType === "admin" && puedeEditar && (
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
                {userType === "admin" &&
                  ["FACTURADO", "ENVIADO", "ENTREGADO"].includes(
                    estadoActual
                  ) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDescargarPdf(pedido)}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                      title="Descargar comprobante PDF"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      PDF
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
              const puedeEditar = ["GENERADO", "SEPARADO"].includes(
                estadoActual
              );

              return (
                <tr key={pedido.id} className="hover:bg-gray-50">
                  {visibleColumns.id && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                      #{pedido.id.slice(-8).toUpperCase()}
                    </td>
                  )}
                  {visibleColumns.cliente && (
                    <td className="px-6 py-4">
                      <div className="max-w-[200px]">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {nombreCliente}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
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
                      {getEstadoBadge(estadoActual)}
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
                      {new Date(pedido.fechaPedido).toLocaleDateString("es-CO")}
                    </td>
                  )}
                  {visibleColumns.flete && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {pedido.flete ? (
                        <span className="text-sm font-medium text-orange-600">
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
                        <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {pedido.guiaTransporte}
                        </span>
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
                        {userType === "admin" && puedeEditar && (
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
                          ["FACTURADO", "ENVIADO", "ENTREGADO"].includes(
                            estadoActual
                          ) && (
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

  // Calcular estadísticas
  const stats = useMemo(() => {
    if (estadisticas) {
      return {
        totalPedidos: estadisticas.totalPedidos,
        pedidosActivos: Object.entries(estadisticas.pedidosPorEstado)
          .filter(([estado]) => estado !== "CANCELADO")
          .reduce((sum, [, count]) => sum + count, 0),
        pedidosInactivos: estadisticas.pedidosPorEstado.CANCELADO || 0,
      };
    }

    const totalPedidos = pedidosFiltrados.length;
    const pedidosActivos = pedidosFiltrados.filter((p) => {
      const estado = getEstadoActual(p);
      return estado !== "CANCELADO";
    }).length;
    const pedidosInactivos = totalPedidos - pedidosActivos;

    return { totalPedidos, pedidosActivos, pedidosInactivos };
  }, [pedidosFiltrados, estadisticas]);

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 lg:p-8 mb-6 lg:mb-8 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
              <FileText className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-white">
                PEDIDOS
              </h1>
              <p className="text-blue-100 text-sm">
                Gestiona tus pedidos de forma profesional
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={refreshPedidos}
              disabled={isRefreshing}
              className="bg-white/10 text-white hover:bg-white/20 border-white/20 backdrop-blur-sm"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Actualizando..." : "Actualizar"}
            </Button>
            <Button
              size="sm"
              onClick={() => (window.location.href = "/catalog")}
              className="bg-white text-blue-600 hover:bg-blue-50 font-medium"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Pedido
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900">
                {stats.totalPedidos}
              </p>
              <p className="text-sm text-gray-500 font-medium">Total Pedidos</p>
            </div>
            <div className="bg-blue-100 p-3 lg:p-4 rounded-xl">
              <div className="w-4 h-4 lg:w-6 lg:h-6 bg-blue-600 rounded-lg"></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900">
                {stats.pedidosActivos}
              </p>
              <p className="text-sm text-gray-500 font-medium">
                Pedidos Activos
              </p>
            </div>
            <div className="bg-green-100 p-3 lg:p-4 rounded-xl">
              <div className="w-4 h-4 lg:w-6 lg:h-6 bg-green-600 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900">
                {stats.pedidosInactivos}
              </p>
              <p className="text-sm text-gray-500 font-medium">
                Pedidos Cancelados
              </p>
            </div>
            <div className="bg-red-100 p-3 lg:p-4 rounded-xl">
              <div className="w-4 h-4 lg:w-6 lg:h-6 bg-red-600 rounded-full"></div>
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

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
              {/* Búsqueda */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar pedidos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>

              {/* Filtro de estado */}
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                <option value="todos">Todos los estados</option>
                {Object.entries(ESTADOS_PEDIDO).map(([key, estado]) => (
                  <option key={key} value={key}>
                    {estado.label}
                  </option>
                ))}
              </select>

              {/* Selector de vista */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === "compact" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("compact")}
                  className="rounded-r-none"
                >
                  <List className="h-4 w-4 mr-1" />
                  Compacta
                </Button>
                <Button
                  variant={viewMode === "cards" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                  className="rounded-none"
                >
                  <Grid3X3 className="h-4 w-4 mr-1" />
                  Tarjetas
                </Button>
                <Button
                  variant={viewMode === "full-table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("full-table")}
                  className="rounded-l-none"
                >
                  <Maximize2 className="h-4 w-4 mr-1" />
                  Completa
                </Button>
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

        {/* Paginación */}
        {pedidosFiltrados.length > 0 && (
          <div className="bg-white px-4 lg:px-6 py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
              <div className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{startIndex + 1}</span>{" "}
                a{" "}
                <span className="font-medium">
                  {Math.min(endIndex, pedidosFiltrados.length)}
                </span>{" "}
                de{" "}
                <span className="font-medium">{pedidosFiltrados.length}</span>{" "}
                elementos
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Anterior
                </Button>

                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNumber =
                      currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                    if (pageNumber > totalPages) return null;

                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`px-3 py-1 rounded text-sm ${
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
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Información sobre actualizaciones */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">
              Información importante
            </h3>
            <div className="text-sm text-blue-700 mt-1 space-y-1">
              <p>
                • **Vista Compacta**: Información esencial sin scroll horizontal
              </p>
              <p>• **Vista Tarjetas**: Perfecta para móviles y tablets</p>
              <p>
                • **Vista Completa**: Todas las columnas con scroll optimizado
              </p>
              <p>
                • Los pedidos solo pueden editarse en estado GENERADO o SEPARADO
              </p>
              <p>
                • El botón PDF aparece solo cuando el pedido está FACTURADO,
                ENVIADO o ENTREGADO
              </p>
              <p>
                • Los cambios se sincronizan automáticamente con el servidor
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
