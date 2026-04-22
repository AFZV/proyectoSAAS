// app/invoices/(components)/InvoicesClient/InvoicesClient.tsx - SIN ESTADO ENTREGADO

"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Search,
  Plus,
  Grid3X3,
  List,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  BadgeCheck,
  ListChecks,
  Package,
  PlusCircle,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";

import { ESTADOS_PEDIDO } from "../../types/invoices.types";
import { invoicesService } from "../../services/invoices.service";
import { InvoiceDetailModal } from "../InvoiceDetailModal";
import { EditPedidoModal } from "../EditPedidoModal";
import type { Pedido, MetaPaginacion } from "../../types/invoices.types";
import { RenderCompactView } from "../RenderCompactView";
import { RenderCardsView } from "../RenderCardsView";

interface InvoicesClientProps {
  pedidos: Pedido[];
  metaInicial?: MetaPaginacion | null;
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
  metaInicial,
}: InvoicesClientProps) {
  // Estados principales
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciales);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [meta, setMeta] = useState<MetaPaginacion | null>(metaInicial ?? null);
  const [currentPage, setCurrentPage] = useState(metaInicial?.currentPage ?? 1);

  // Filtros
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");
  const [rawSearch, setRawSearch] = useState(""); // texto crudo
  const [searchTerm, setSearchTerm] = useState(""); // texto debounced

  // Paginación server-side
  // const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [viewMode, setViewMode] = useState<ViewMode>("compact");

  const { getToken } = useAuth();
  const { toast } = useToast();

  // 🔁 Debounce del texto de búsqueda
  useEffect(() => {
    const id = setTimeout(() => {
      setSearchTerm(rawSearch);
    }, 200);
    return () => clearTimeout(id);
  }, [rawSearch]);

  // 🔄 Fetch central con paginación + filtros
  const fetchPedidos = useCallback(
    async (page: number = 1) => {
      try {
        setIsRefreshing(true);
        const token = await getToken();
        if (!token) return;

        const resp = await invoicesService.obtenerPedidosPaginados(token, {
          pagina: page,
          limite: itemsPerPage,
          estado: estadoFiltro,
          q: searchTerm,
        });

        setPedidos(resp.data);
        setMeta(resp.meta);
        setCurrentPage(resp.meta.currentPage);
      } catch (error) {
        console.error("Error al obtener pedidos paginados:", error);
        toast({
          title: "Error al cargar pedidos",
          description: "No se pudieron obtener los pedidos paginados",
          variant: "destructive",
        });
      } finally {
        setIsRefreshing(false);
      }
    },
    [getToken, itemsPerPage, estadoFiltro, searchTerm, toast],
  );

  // ▶️ Cargar al montar y cuando cambian filtros/búsqueda (debounced)
  useEffect(() => {
    if (!pedidosIniciales?.length || !metaInicial) {
      fetchPedidos(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // cuando cambia estadoFiltro o searchTerm, traemos la página 1
    fetchPedidos(1);
  }, [estadoFiltro, searchTerm, fetchPedidos]);

  const STAT_ICONS: Record<
    string,
    { Icon: React.ElementType; bg: string; fg: string }
  > = {
    totalPedidos: { Icon: ListChecks, bg: "bg-blue-100", fg: "text-blue-600" },
    pedidosGenerados: {
      Icon: PlusCircle,
      bg: "bg-blue-100",
      fg: "text-blue-600",
    },
    pedidosFacturados: {
      Icon: FileText,
      bg: "bg-purple-100",
      fg: "text-purple-600",
    },
    pedidosCompletados: {
      Icon: CheckCircle,
      bg: "bg-green-100",
      fg: "text-green-600",
    }, // ENVIADO
    pedidosCancelados: { Icon: XCircle, bg: "bg-red-100", fg: "text-red-600" },
    pedidosSeparados: {
      Icon: Package,
      bg: "bg-yellow-100",
      fg: "text-yellow-600",
    },
    pedidosAceptados: {
      Icon: BadgeCheck,
      bg: "bg-gray-100",
      fg: "text-gray-700",
    },
  };

  function StatCard({
    label,
    value,
    statKey,
  }: {
    label: string;
    value: number;
    statKey: keyof typeof STAT_ICONS;
  }) {
    const { Icon, bg, fg } = STAT_ICONS[statKey];
    return (
      <div className="bg-white rounded-xl p-3 lg:p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl lg:text-3xl font-bold text-gray-900">
              {value}
            </p>
            <p className="text-xs lg:text-sm text-gray-500 font-medium">
              {label}
            </p>
          </div>
          <div className={`${bg} p-2 lg:p-4 rounded-xl`}>
            <Icon className={`w-3 h-3 lg:w-6 lg:h-6 ${fg}`} />
          </div>
        </div>
      </div>
    );
  }

  // Helpers
  const getEstadoActual = (pedido: Pedido): string => {
    // ✅ si ya lo tienes guardado en Pedido, úsalo
    const ea = (pedido as any).estadoActual as string | undefined; // o tipéalos bien
    if (ea && ea.trim() !== "") return ea;

    // fallback legacy: NO ordenar, solo hallar el más reciente por scan
    const estados = pedido.estados ?? [];
    if (estados.length === 0) return "GENERADO";

    let ultimo = estados[0];
    for (let i = 1; i < estados.length; i++) {
      if (
        new Date(estados[i].fechaEstado).getTime() >
        new Date(ultimo.fechaEstado).getTime()
      ) {
        ultimo = estados[i];
      }
    }
    return ultimo.estado;
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
      return `${razon}\n${nombreCompleto}`;
    }

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

  const getEstadoBadge = (estado: string) => {
    const estadoInfo = ESTADOS_PEDIDO[estado as keyof typeof ESTADOS_PEDIDO];
    let badgeClass =
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";

    switch (estado) {
      case "GENERADO":
        badgeClass += " bg-blue-100 text-blue-800";
        break;
      case "ACEPTADO":
        badgeClass += " bg-gray-100 text-gray-800";
        break;
      case "SEPARADO":
        badgeClass += " bg-yellow-100 text-yellow-800";
        break;
      case "FACTURADO":
        badgeClass += " bg-purple-100 text-purple-800";
        break;
      case "ENVIADO":
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
    if (pedido) {
      setSelectedPedido(pedido);
      setIsEditModalOpen(true);
    }
  };

  const handleDescargarPdf = async (pedido: Pedido) => {
    try {
      const urlConTimestamp = `${pedido.pdfUrl}?t=${Date.now()}`;

      const response = await fetch(urlConTimestamp);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `pedido_${pedido.id.slice(0, 5)}.pdf`;
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
        description: "No se pudo descargar el PDF",
        variant: "destructive",
      });
    }
  };

  const refreshPedidos = async () => {
    await fetchPedidos(currentPage);
    toast({
      title: "Datos actualizados",
      description: "La lista de pedidos se ha actualizado correctamente",
    });
  };

  const handleUpdatePedido = async (pedidoActualizado: Pedido) => {
    setPedidos((prev) =>
      prev.map((p) => (p.id === pedidoActualizado.id ? pedidoActualizado : p)),
    );
    setSelectedPedido(pedidoActualizado);

    setTimeout(() => {
      refreshPedidos();
    }, 1000);
  };

  const getFechaEstado = (
    pedido: Pedido,
    estadoBuscado: string,
    modo: "primero" | "ultimo" = "ultimo",
  ): string | null => {
    if (!pedido?.estados?.length) return null;
    const coincidencias = pedido.estados
      .filter((e) => e.estado === estadoBuscado && e.fechaEstado)
      .sort(
        (a, b) =>
          new Date(a.fechaEstado).getTime() - // 👈 corregido
          new Date(b.fechaEstado).getTime(),
      ); // asc

    if (coincidencias.length === 0) return null;
    return modo === "primero"
      ? coincidencias[0].fechaEstado
      : coincidencias[coincidencias.length - 1].fechaEstado;
  };

  const getFechaParaMostrar = (pedido: Pedido): string => {
    const f = (pedido as any).fechaEstadoActual as string | undefined;
    if (f) return f;

    // fallback viejo
    const fFacturado = getFechaEstado(pedido, "FACTURADO", "ultimo");
    return (fFacturado ?? pedido.fechaPedido) as string;
  };

  // Stats: backend o calculados
  const stats = useMemo(() => {
    if (estadisticas) {
      return {
        totalPedidos: estadisticas.totalPedidos,
        pedidosActivos: Object.entries(estadisticas.pedidosPorEstado)
          .filter(
            ([estado]) =>
              ![
                "GENERADO",
                "CANCELADO",
                "ENVIADO",
                "SEPARADO",
                "FACTURADO",
                "ACEPTADO",
              ].includes(estado),
          )
          .reduce((sum, [, count]) => sum + count, 0),
        pedidosCompletados: estadisticas.pedidosPorEstado.ENVIADO || 0,
        pedidosCancelados: estadisticas.pedidosPorEstado.CANCELADO || 0,
        pedidosSeparados: estadisticas.pedidosPorEstado.SEPARADO || 0,
        pedidosGenerados: estadisticas.pedidosPorEstado.GENERADO || 0,
        pedidosFacturados: estadisticas.pedidosPorEstado.FACTURADO || 0,
        pedidosAceptados: estadisticas.pedidosPorEstado.ACEPTADO || 0,
      };
    }

    const totalPedidos = pedidos.length;
    const pedidosGenerados = pedidos.filter(
      (p) => getEstadoActual(p) === "GENERADO",
    ).length;
    const pedidosCompletados = pedidos.filter(
      (p) => getEstadoActual(p) === "ENVIADO",
    ).length;
    const pedidosCancelados = pedidos.filter(
      (p) => getEstadoActual(p) === "CANCELADO",
    ).length;
    const pedidosSeparados = pedidos.filter(
      (p) => getEstadoActual(p) === "SEPARADO",
    ).length;
    const pedidosFacturados = pedidos.filter(
      (p) => getEstadoActual(p) === "FACTURADO",
    ).length;
    const pedidosAceptados = pedidos.filter(
      (p) => getEstadoActual(p) === "ACEPTADO",
    ).length;

    return {
      totalPedidos,
      pedidosGenerados,
      pedidosFacturados,
      pedidosCompletados,
      pedidosCancelados,
      pedidosSeparados,
      pedidosAceptados,
    };
  }, [pedidos, estadisticas]);

  // Paginación desde backend
  const totalItems = meta?.totalItems ?? pedidos.length;
  const totalPages = meta?.totalPages ?? 1;
  const pageSize = meta?.pageSize ?? itemsPerPage;

  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);

  // Los pedidos YA vienen paginados desde el backend
  const pedidosPaginaActual = pedidos;
  const [generandoManifiestos, setGenerandoManifiestos] = useState(false);

  const handleDescargarManifiestos = async (pedido: Pedido) => {
    try {
      setGenerandoManifiestos(true);
      const token = await getToken();
      if (!token) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/pedidos/manifiestos/fusionar/${pedido.id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!response.ok) throw new Error("Error al obtener manifiestos");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `manifiestos_${pedido.id.slice(0, 5)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Manifiestos descargados",
        description: "El PDF de manifiestos se descargó correctamente",
      });
    } catch (error) {
      console.error("Error al descargar manifiestos:", error);
      toast({
        title: "Error al descargar",
        description: "No se pudo descargar el PDF de manifiestos",
        variant: "destructive",
      });
    } finally {
      setGenerandoManifiestos(false);
    }
  };

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
        <StatCard
          label="Total"
          value={stats.totalPedidos}
          statKey="totalPedidos"
        />
        <StatCard
          label="Generados"
          value={stats.pedidosGenerados}
          statKey="pedidosGenerados"
        />
        <StatCard
          label="Aceptados"
          value={stats.pedidosAceptados}
          statKey="pedidosAceptados"
        />
        <StatCard
          label="Separados"
          value={stats.pedidosSeparados}
          statKey="pedidosSeparados"
        />
        <StatCard
          label="Facturados"
          value={stats.pedidosFacturados}
          statKey="pedidosFacturados"
        />
        <StatCard
          label="Enviados ✓"
          value={stats.pedidosCompletados}
          statKey="pedidosCompletados"
        />
        <StatCard
          label="Cancelados"
          value={stats.pedidosCancelados}
          statKey="pedidosCancelados"
        />
      </div>

      {/* Contenedor principal */}
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
                  value={rawSearch}
                  onChange={(e) => setRawSearch(e.target.value)}
                  className="pl-10 w-full lg:w-64"
                />
              </div>

              <div className="flex space-x-3">
                {/* Filtro estado */}
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

                {/* Vista */}
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
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido según vista */}
        {pedidosPaginaActual.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay pedidos
            </h3>
            <p className="text-gray-500 mb-4">
              {totalItems === 0
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
            {viewMode === "compact" && (
              <RenderCompactView
                pedidos={pedidosPaginaActual}
                userType={userType}
                getEstadoActual={getEstadoActual}
                getFechaParaMostrar={getFechaParaMostrar}
                getEstadoBadge={getEstadoBadge}
                onVerDetalle={handleVerDetalle}
                onEditarPedido={handleEditarPedido}
                onDescargarPdf={handleDescargarPdf}
                onDescargarManifiestos={handleDescargarManifiestos}
              />
            )}

            {viewMode === "cards" && (
              <RenderCardsView
                pedidos={pedidosPaginaActual}
                userType={userType}
                getEstadoActual={getEstadoActual}
                getFechaParaMostrar={getFechaParaMostrar}
                getNombreVendedor={getNombreVendedor}
                getEstadoBadge={getEstadoBadge}
                onVerDetalle={handleVerDetalle}
                onEditarPedido={handleEditarPedido}
                onDescargarPdf={handleDescargarPdf}
                onDescargarManifiestos={handleDescargarManifiestos}
              />
            )}
          </>
        )}

        {/* Paginación */}
        {totalItems > 0 && (
          <div className="bg-white px-3 lg:px-6 py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              <div className="text-xs lg:text-sm text-gray-700 text-center lg:text-left">
                Mostrando <span className="font-medium">{rangeStart}</span> a{" "}
                <span className="font-medium">{rangeEnd}</span> de{" "}
                <span className="font-medium">{totalItems}</span> elementos
              </div>

              <div className="flex items-center justify-center space-x-1 lg:space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => fetchPedidos(currentPage - 1)}
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
                        onClick={() => fetchPedidos(pageNumber)}
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
                  onClick={() => fetchPedidos(currentPage + 1)}
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

      {/* Info flujo */}
      <div className="mt-6 p-3 lg:p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex">
          <AlertCircle className="h-4 w-4 lg:h-5 lg:w-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Información - Flujo sin ENTREGADO
            </h3>
            <div className="text-xs lg:text-sm text-blue-700 space-y-1">
              <p>• ENVIADO es ahora el estado final exitoso ✓</p>
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

      {/* Overlay manifiestos */}
      {generandoManifiestos && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center space-y-4 max-w-sm w-full mx-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
              <FileText className="h-6 w-6 text-purple-600 absolute inset-0 m-auto" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">
                Generando manifiestos
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Fusionando PDFs, esto puede tomar unos segundos...
              </p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-purple-600 rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        </div>
      )}

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
