// app/invoices/(components)/InvoicesClient/InvoiceClient.tsx

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
  Trash2,
  AlertCircle,
  Filter,
  Columns,
  RefreshCw,
  Truck,
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
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Columnas visibles
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    cliente: true,
    contacto: true,
    total: true,
    estado: true,
    vendedor: true,
    fecha: true,
    flete: true,
    acciones: true,
  });

  const { getToken, userId } = useAuth();
  const { toast } = useToast();

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
      `${pedido.cliente.nombre || "Cliente"} ${pedido.cliente.apellidos || ""}`.trim()
    );
  };

  const getNombreVendedor = (pedido: Pedido): string => {
    if (!pedido.usuario) {
      return `Usuario ID: ${pedido.usuarioId.slice(-8)}`;
    }

    return `${pedido.usuario.nombre || "Usuario"} ${pedido.usuario.apellidos || ""}`.trim();
  };

  // Filtrar pedidos
  const pedidosFiltrados = useMemo(() => {
    let filtered = pedidos;

    // Filtrar por término de búsqueda
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

    // Filtrar por estado
    if (estadoFiltro !== "todos") {
      filtered = filtered.filter((pedido) => {
        const estadoActual = getEstadoActual(pedido);
        return estadoActual === estadoFiltro;
      });
    }

    // Ordenar por fecha más reciente
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

  const handleVerDetalle = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setIsDetailModalOpen(true);
  };

  const handleEditarPedido = (pedido: Pedido) => {
    const estadoActual = getEstadoActual(pedido);

    // Verificar si el pedido puede ser editado
    if (!["GENERADO", "SEPARADO"].includes(estadoActual)) {
      toast({
        title: "No se puede editar",
        description: `Los pedidos en estado ${ESTADOS_PEDIDO[estadoActual as keyof typeof ESTADOS_PEDIDO]?.label} no pueden ser modificados`,
        variant: "destructive",
      });
      return;
    }

    setSelectedPedido(pedido);
    setIsEditModalOpen(true);
  };

  const handleEliminarPedido = (pedidoId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este pedido?")) {
      toast({
        title: "Función no implementada",
        description: "La eliminación de pedidos estará disponible próximamente",
        variant: "destructive",
      });
    }
  };

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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 mb-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">PEDIDOS</h1>
              <p className="text-blue-100 text-sm">
                Gestiona tus pedidos de forma profesional
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
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
              variant="secondary"
              size="sm"
              onClick={() => (window.location.href = "/clientes")}
              className="bg-white/10 text-white hover:bg-white/20 border-white/20 backdrop-blur-sm"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Gestionar Clientes
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {stats.totalPedidos}
              </p>
              <p className="text-sm text-gray-500 font-medium">Total Pedidos</p>
              <p className="text-xs text-gray-400">En la plataforma</p>
            </div>
            <div className="bg-blue-100 p-4 rounded-xl">
              <div className="w-6 h-6 bg-blue-600 rounded-lg"></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {stats.pedidosActivos}
              </p>
              <p className="text-sm text-gray-500 font-medium">
                Pedidos Activos
              </p>
              <p className="text-xs text-gray-400">En proceso</p>
            </div>
            <div className="bg-green-100 p-4 rounded-xl">
              <div className="w-6 h-6 bg-green-600 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {stats.pedidosInactivos}
              </p>
              <p className="text-sm text-gray-500 font-medium">
                Pedidos Cancelados
              </p>
              <p className="text-xs text-gray-400">Estado inactivo</p>
            </div>
            <div className="bg-red-100 p-4 rounded-xl">
              <div className="w-6 h-6 bg-red-600 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Lista de Pedidos
            </h2>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por cliente, ID, teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
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

              {/* Botón de columnas */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Columns className="h-4 w-4 mr-2" />
                    COLUMNAS
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configurar Columnas</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
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
                              : key === "flete"
                                ? "Flete"
                                : key === "acciones"
                                  ? "Acciones"
                                  : key}
                        </label>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {visibleColumns.id && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                )}
                {visibleColumns.cliente && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                )}
                {visibleColumns.contacto && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                )}
                {visibleColumns.total && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                )}
                {visibleColumns.estado && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                )}
                {visibleColumns.vendedor && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                )}
                {visibleColumns.fecha && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                )}
                {visibleColumns.flete && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Flete
                  </th>
                )}
                {visibleColumns.acciones && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pedidosPaginados.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      Object.values(visibleColumns).filter(Boolean).length
                    }
                    className="px-6 py-12 text-center"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="h-12 w-12 text-gray-400 mb-4" />
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
                  </td>
                </tr>
              ) : (
                pedidosPaginados.map((pedido) => {
                  const estadoActual = getEstadoActual(pedido);
                  const nombreCliente = getNombreCliente(pedido);
                  const nombreVendedor = getNombreVendedor(pedido);
                  const puedeEditar = ["GENERADO", "SEPARADO"].includes(
                    estadoActual
                  );

                  return (
                    <tr
                      key={pedido.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {visibleColumns.id && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                          #{pedido.id.slice(-8).toUpperCase()}
                        </td>
                      )}
                      {visibleColumns.cliente && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {nombreCliente}
                            </div>
                            <div className="text-sm text-gray-500">
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
                            <span className="text-sm text-gray-900">
                              {nombreVendedor}
                            </span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.fecha && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(pedido.fechaPedido).toLocaleDateString(
                            "es-CO"
                          )}
                        </td>
                      )}
                      {visibleColumns.flete && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {pedido.flete ? (
                            <div className="flex items-center space-x-1">
                              <Truck className="h-4 w-4 text-orange-500" />
                              <span className="text-sm font-medium text-orange-600">
                                {formatValue(pedido.flete)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.acciones && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVerDetalle(pedido)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {userType === "admin" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditarPedido(pedido)}
                                  className={`${
                                    puedeEditar
                                      ? "text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                                      : "text-gray-400 cursor-not-allowed"
                                  }`}
                                  title={
                                    puedeEditar
                                      ? "Editar pedido"
                                      : "No se puede editar en este estado"
                                  }
                                  disabled={!puedeEditar}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleEliminarPedido(pedido.id)
                                  }
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Eliminar pedido"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                              title="Más opciones"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {pedidosFiltrados.length > 0 && (
          <div className="bg-white px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
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

                {/* Números de página */}
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
          <AlertCircle className="h-5 w-5 text-blue-400 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">
              Información importante
            </h3>
            <div className="text-sm text-blue-700 mt-1 space-y-1">
              <p>
                • Los pedidos solo pueden editarse en estado GENERADO o SEPARADO
              </p>
              <p>
                • El valor del flete se muestra cuando bodega envía el pedido
              </p>
              <p>
                • Los cambios se sincronizan automáticamente con el servidor
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de detalles */}
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

      {/* Modal de edición */}
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
