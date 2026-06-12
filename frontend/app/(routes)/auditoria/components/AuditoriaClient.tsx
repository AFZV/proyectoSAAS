"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { ClipboardList, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Paginator } from "@/components/Paginator/Paginator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import React from "react";

// Valores exactos que guarda la BD (desde AuditEntidad enum)
const ENTIDADES = [
  { value: "Pedido", label: "Pedido" },
  { value: "Recibo", label: "Recibo" },
  { value: "Producto", label: "Producto" },
  { value: "Cliente", label: "Cliente" },
  { value: "Usuario", label: "Usuario" },
  { value: "Empresa", label: "Empresa" },
  { value: "Inventario", label: "Inventario" },
  { value: "FacturaProveedor", label: "Factura Proveedor" },
  { value: "PagoProveedor", label: "Pago Proveedor" },
];

const ACCION_CONFIG: Record<string, { label: string; className: string }> = {
  CREAR: {
    label: "Crear",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  ACTUALIZAR: {
    label: "Actualizar",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  ELIMINAR: {
    label: "Eliminar",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  CAMBIO_ESTADO: {
    label: "Cambio Estado",
    className:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  REVISAR: {
    label: "Revisado",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  SUBIR_ARCHIVO: {
    label: "Archivo",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
};

type AuditLog = {
  id: string;
  usuarioNombre: string;
  accion: string;
  entidad: string;
  entidadId: string;
  detalle: Record<string, unknown> | null;
  ip: string | null;
  creadoEn: string;
};

type ApiResponse = {
  total: number;
  page: number;
  limit: number;
  data: AuditLog[];
};

const PAGE_SIZE = 50;

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

type Cambio = {
  tipo: string;
  antes?: unknown;
  despues?: unknown;
  nombre?: string;
  cantidad?: number;
};

const CAMBIO_LABEL: Record<string, string> = {
  cliente: "Cliente",
  total: "Total",
  metodoPago: "Método pago",
  concepto: "Concepto",
  cantidad_cambiada: "",
  item_agregado: "",
  item_eliminado: "",
};

function CambioRow({ c }: { c: Cambio }) {
  if (c.tipo === "item_agregado") {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="w-4 text-green-600 font-bold">+</span>
        <span className="text-green-700 dark:text-green-400 font-medium">
          {c.nombre}
        </span>
        <span className="text-muted-foreground">×{c.cantidad}</span>
      </div>
    );
  }
  if (c.tipo === "item_eliminado") {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="w-4 text-red-500 font-bold">−</span>
        <span className="text-red-600 dark:text-red-400 font-medium line-through">
          {c.nombre}
        </span>
        <span className="text-muted-foreground">×{c.cantidad}</span>
      </div>
    );
  }
  if (c.tipo === "cantidad_cambiada") {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="w-4 text-orange-500 font-bold">~</span>
        <span className="text-foreground font-medium">{c.nombre}</span>
        <span className="text-red-400 line-through">{String(c.antes)}u</span>
        <span className="text-muted-foreground">→</span>
        <span className="text-green-600 font-semibold">{String(c.despues)}u</span>
      </div>
    );
  }
  // Scalar diff (cliente, total, metodoPago, concepto)
  const label = CAMBIO_LABEL[c.tipo] ?? c.tipo;
  const fmtVal = (v: unknown) =>
    c.tipo === "total" ? formatMoney(Number(v)) : String(v);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="font-medium text-muted-foreground w-20 shrink-0">
        {label}:
      </span>
      <span className="text-red-400 line-through">{fmtVal(c.antes)}</span>
      <span className="text-muted-foreground">→</span>
      <span className="text-green-600 font-semibold">{fmtVal(c.despues)}</span>
    </div>
  );
}

function DetalleAudit({ detalle }: { detalle: Record<string, unknown> }) {
  // ── Diff genérico de cambios (pedido update, recibo update) ─────────────
  if (Array.isArray(detalle.cambios)) {
    const cambios = detalle.cambios as Cambio[];
    return (
      <div className="space-y-1.5">
        {cambios.map((c, i) => (
          <CambioRow key={i} c={c} />
        ))}
      </div>
    );
  }

  // ── Creación de pedido ──────────────────────────────────────────────────
  if ("cliente" in detalle && "totalItems" in detalle) {
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span>
          <span className="text-muted-foreground">Cliente: </span>
          <span className="font-medium">{String(detalle.cliente)}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Total: </span>
          <span className="font-semibold">{formatMoney(Number(detalle.total))}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Items: </span>
          <span>{String(detalle.totalItems)}</span>
        </span>
      </div>
    );
  }

  // ── Cambio de estado (agregarEstado) ────────────────────────────────────
  if ("nuevoEstado" in detalle) {
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span>
          <span className="text-muted-foreground">Estado: </span>
          <span className="font-semibold">{String(detalle.nuevoEstado)}</span>
        </span>
        {detalle.total !== undefined && (
          <span>
            <span className="text-muted-foreground">Total: </span>
            <span className="font-medium">{formatMoney(Number(detalle.total))}</span>
          </span>
        )}
        {!!detalle.guiaTransporte && (
          <span>
            <span className="text-muted-foreground">Guía: </span>
            <span className="font-mono">{String(detalle.guiaTransporte)}</span>
          </span>
        )}
      </div>
    );
  }

  // ── Creación de recibo ──────────────────────────────────────────────────
  if ("totalAbonado" in detalle) {
    return (
      <div className="text-xs">
        <span className="text-muted-foreground">Total abonado: </span>
        <span className="font-semibold">{formatMoney(Number(detalle.totalAbonado))}</span>
      </div>
    );
  }

  // ── Marcar revisado ─────────────────────────────────────────────────────
  if ("revisado" in detalle) {
    return (
      <div className="text-xs">
        <span className={detalle.revisado ? "text-green-600 font-medium" : "text-muted-foreground"}>
          {detalle.revisado ? "Marcado como revisado" : "Desmarcado como revisado"}
        </span>
      </div>
    );
  }

  // ── Diff antes/despues (actualizarProducto) ─────────────────────────────
  if ("antes" in detalle && "despues" in detalle) {
    const antes = detalle.antes as Record<string, unknown>;
    const despues = detalle.despues as Record<string, unknown>;
    const changedKeys = Object.keys(antes).filter(
      (k) => String(antes[k]) !== String(despues[k])
    );
    return (
      <div className="space-y-1">
        {changedKeys.length === 0 ? (
          <span className="text-xs text-muted-foreground">Sin cambios</span>
        ) : (
          changedKeys.map((k) => (
            <div key={k} className="flex items-center gap-2 text-xs">
              <span className="font-medium text-muted-foreground capitalize w-24 shrink-0">{k}:</span>
              <span className="line-through text-red-400">{String(antes[k])}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-green-600 font-semibold">{String(despues[k])}</span>
            </div>
          ))
        )}
      </div>
    );
  }

  // Fallback: JSON limpio
  return (
    <pre className="text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-all bg-background rounded-md border p-3 max-h-40">
      {JSON.stringify(detalle, null, 2)}
    </pre>
  );
}

export default function AuditoriaClient() {
  const { getToken } = useAuth();
  const [data, setData] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [entidad, setEntidad] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = async (p: number, ent: string) => {
    setLoading(true);
    try {
      const token = await getToken();
      const params = new URLSearchParams({
        page: String(p + 1),
        limit: String(PAGE_SIZE),
      });
      if (ent !== "all") params.set("entidad", ent);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auditoria?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return;
      const json: ApiResponse = await res.json();
      setData(json.data);
      setTotal(json.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page, entidad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, entidad]);

  const handleEntidadChange = (val: string) => {
    setEntidad(val);
    setPage(0);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-950/30 dark:to-slate-900/20 -mx-4 px-4 py-6 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-slate-600 to-slate-700 rounded-full flex items-center justify-center shadow-md">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                Auditoría
              </h1>
              <p className="text-sm text-muted-foreground">
                Registro de actividad del sistema
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(page, entidad)}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select value={entidad} onValueChange={handleEntidadChange}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filtrar por entidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las entidades</SelectItem>
            {ENTIDADES.map((e) => (
              <SelectItem key={e.value} value={e.value}>
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {entidad !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEntidadChange("all")}
            className="text-muted-foreground h-8"
          >
            Limpiar filtro
          </Button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {loading ? "…" : `${total} registro${total !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  Fecha
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  Usuario
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  Acción
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  Entidad
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  ID
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  Detalle
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted rounded animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-16 text-center text-muted-foreground"
                  >
                    No hay registros de auditoría
                    {entidad !== "all" &&
                      ` para ${ENTIDADES.find((e) => e.value === entidad)?.label ?? entidad}`}
                  </td>
                </tr>
              ) : (
                data.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr
                      className={cn(
                        "border-b transition-colors",
                        log.detalle
                          ? "cursor-pointer hover:bg-muted/30"
                          : "hover:bg-muted/10"
                      )}
                      onClick={() => {
                        if (!log.detalle) return;
                        setExpandedId(
                          expandedId === log.id ? null : log.id
                        );
                      }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                        {format(new Date(log.creadoEn), "dd/MM/yy HH:mm", {
                          locale: es,
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {log.usuarioNombre}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
                            ACCION_CONFIG[log.accion]?.className ??
                              "bg-gray-100 text-gray-700"
                          )}
                        >
                          {ACCION_CONFIG[log.accion]?.label ?? log.accion}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 whitespace-nowrap">
                          {log.entidad}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {log.entidadId.length > 8
                          ? `${log.entidadId.slice(0, 8)}…`
                          : log.entidadId}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {log.detalle ? (
                          <span className="text-blue-600 dark:text-blue-400 select-none">
                            {expandedId === log.id ? "Ocultar ▲" : "Ver ▼"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                    {expandedId === log.id && log.detalle && (
                      <tr className="bg-muted/20 border-b">
                        <td colSpan={6} className="px-6 py-4">
                          <DetalleAudit
                            detalle={
                              log.detalle as Record<string, unknown>
                            }
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && total > 0 && (
          <div className="px-4 py-3 border-t">
            <Paginator
              page={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
