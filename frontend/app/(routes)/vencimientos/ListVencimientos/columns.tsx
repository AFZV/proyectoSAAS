"use client";

import { useEffect, useState } from "react";
import { ColumnDef, type Column } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { formatValue } from "@/utils/FormartValue";
import { Eye, MoreHorizontal, X } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import React from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet } from "lucide-react";
// =============== Tipos ===============
export type ClienteConSaldo = {
  idCliente: string;
  nombre: string;
  identificacion?: string; // NIT/CC
  ciudad?: string;
  telefono?: string;
  email?: string;
  saldoPendienteCOP: number; // SIEMPRE en COP
};

export type MovimientoCliente = {
  id: string;
  fecha: string | Date;
  tipo: "Factura" | "Recaudo" | "Nota crédito" | "Ajuste";
  numero: string;
  monto: number;
  saldo: number;
  descripcion?: string;
  vencimiento?: string | Date;
  pedidoId?: string; // 👈 añadir aquí
  pedidosIds?: string[];
  pedidosIdsAjuste?: string[];
  ajusteDetalles?: { pedidoId: string; valor: number }[]; // ← nuevo
};

// =============== Utils UI ===============
function getTipoBadgeVariant(tipo: MovimientoCliente["tipo"]) {
  switch (tipo) {
    case "Factura":
      return "default" as const;
    case "Recaudo":
      return "outline" as const;
    case "Nota crédito":
      return "secondary" as const;
    case "Ajuste":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

// =============== Detalles (ligero) ===============
function ClienteDetalles({
  cliente,
  onClose,
}: {
  cliente: ClienteConSaldo;
  onClose: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
          <div>
            <label className="text-xs text-muted-foreground">Cliente</label>
            <p className="text-lg font-semibold">{cliente.nombre}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              Identificación
            </label>
            <p className="font-mono text-sm">{cliente.identificacion ?? "—"}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Correo</label>
            <p className="text-sm">{cliente.email ?? "—"}</p>
          </div>
        </div>
        <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
          <div>
            <label className="text-xs text-muted-foreground">Ciudad</label>
            <p className="text-sm">{cliente.ciudad ?? "—"}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Teléfono</label>
            <p className="font-mono text-sm">{cliente.telefono ?? "—"}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              Saldo pendiente (COP)
            </label>
            <p
              className={cn(
                "text-xl font-bold tabular-nums",
                cliente.saldoPendienteCOP > 0
                  ? "text-amber-700"
                  : cliente.saldoPendienteCOP < 0
                  ? "text-green-600"
                  : "text-muted-foreground"
              )}
            >
              {formatValue(cliente.saldoPendienteCOP)}
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="inline-flex h-9 items-center justify-center rounded-md border border-blue-500 px-3 text-sm font-medium text-blue-600 hover:bg-blue-50"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

function isoToLocalDateStr(val?: string | Date | null) {
  if (!val) return "";
  const d = typeof val === "string" ? new Date(val) : val;
  return d.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Aplana tus MovimientoCliente en filas “exportables”:
 *  - Factura: 1 fila
 *  - Recaudo: si hay varios pedidosIds → una fila por pedido
 *  - Ajuste: usa ajusteDetalles (pedidoId, valor) → una fila por pedido con valor
 */
function flattenMovimientosForExport(items: MovimientoCliente[]) {
  const rows: Array<{
    Fecha: string;
    Vencimiento: string;
    Tipo: string;
    Numero: string;
    Pedido: string;
    Monto: number | string;
    Saldo: number | string;
    Descripcion: string;
  }> = [];

  for (const m of items) {
    const base = {
      Fecha: isoToLocalDateStr(m.fecha),
      Vencimiento: isoToLocalDateStr(m.vencimiento),
      Tipo: m.tipo,
      Numero: m.numero || "",
      Descripcion: m.descripcion || "",
    };

    // === AJUSTE: usar ajusteDetalles [{pedidoId, valor}]
    if (
      m.tipo === "Ajuste" &&
      Array.isArray(m.ajusteDetalles) &&
      m.ajusteDetalles.length
    ) {
      for (const d of m.ajusteDetalles) {
        rows.push({
          ...base,
          Pedido: d.pedidoId ? `#${d.pedidoId.slice(0, 6).toUpperCase()}` : "—",
          Monto: -Math.abs(Number(d.valor || 0)),
          Saldo: m.saldo, // o "—" si prefieres
        });
      }
      continue;
    }

    // === RECAUDO: múltiples pedidosIds → una fila por pedido (sin valor por pedido si no lo traes)
    if (
      m.tipo === "Recaudo" &&
      Array.isArray(m.pedidosIds) &&
      m.pedidosIds.length > 1
    ) {
      for (const pid of m.pedidosIds) {
        rows.push({
          ...base,
          Pedido: pid ? `#${pid.slice(0, 6).toUpperCase()}` : "—",
          Monto: "—", // si luego envías valor por pedido, cámbialo aquí
          Saldo: m.saldo,
        });
      }
      continue;
    }

    // === CASO GENERAL (Factura / Recaudo simple / Ajuste sin detalles)
    const pedido = m.pedidoId
      ? `#${m.pedidoId.slice(0, 6).toUpperCase()}`
      : Array.isArray(m.pedidosIds) && m.pedidosIds.length === 1
      ? `#${m.pedidosIds[0].slice(0, 6).toUpperCase()}`
      : "—";

    rows.push({
      ...base,
      Pedido: pedido,
      Monto: m.monto,
      Saldo: m.saldo,
    });
  }

  return rows;
}

function excelFileName(clienteNombre: string) {
  const clean = (clienteNombre || "cliente")
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  const today = new Date().toISOString().slice(0, 10);
  return `historial_${clean}_${today}.xlsx`;
}

// =============== Historial (ligero, solo lectura) ===============
function ClienteHistorial({
  clienteId,
  clienteNombre,
  onClose,
}: {
  clienteId: string;
  clienteNombre: string;
  onClose: () => void;
}) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<MovimientoCliente[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});

  const exportarExcel = () => {
    const rows = flattenMovimientosForExport(items);
    const headers = [
      "Fecha",
      "Vencimiento",
      "Tipo",
      "Número",
      "Pedido",
      "Monto",
      "Saldo",
      "Descripción",
    ];

    // Estructura AOA (arreglo de arreglos)
    const aoa = [
      ["HISTORIAL DE MOVIMIENTOS"],
      [""],
      ["Cliente:", clienteNombre],
      ["Fecha de reporte:", new Date().toLocaleDateString("es-CO")],
      [""],
      headers,
      ...rows.map((r) => [
        r.Fecha,
        r.Vencimiento,
        r.Tipo,
        r.Numero,
        r.Pedido,
        r.Monto, // números se guardan como número en Excel
        r.Saldo,
        r.Descripcion,
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Ajuste ancho de columnas (opcional)
    const colWidths = [12, 12, 12, 12, 14, 12, 12, 40].map((w) => ({ wch: w }));
    (ws as any)["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial");

    XLSX.writeFile(wb, excelFileName(clienteNombre));
  };

  const API = process.env.NEXT_PUBLIC_API_URL ?? "";
  const toggle = (k: string) =>
    setExpandido((prev) => ({ ...prev, [k]: !prev[k] }));

  const fetchMovs = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const url = `${API}/balance/movimientos/porCliente/${clienteId}`; // backend ya ordena y calcula saldo
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok)
        throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
      const data: MovimientoCliente[] = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error("fetchMovs error", e);
      setError(e?.message || "Error cargando movimientos");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  // ========= Agrupación en front (sin reordenar ni recalcular) =========
  type Grupo = {
    key: string; // tipo:numero o clave única
    tipo: MovimientoCliente["tipo"];
    numero: string;
    fechaPrimera: Date;
    vencimiento?: Date | undefined;
    totalMonto: number; // suma de montos del grupo
    saldoFinal: number; // saldo del último item del grupo (según orden recibido)
    items: MovimientoCliente[];
  };

  const grupos: Grupo[] = (() => {
    const orderKeys: string[] = [];
    const map = new Map<string, Grupo>();

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const fecha =
        typeof it.fecha === "string" ? new Date(it.fecha) : (it.fecha as Date);
      const venc = it.vencimiento
        ? typeof it.vencimiento === "string"
          ? new Date(it.vencimiento)
          : (it.vencimiento as Date)
        : undefined;

      // Agrupar sólo Recaudo/Ajuste por "tipo+numero"
      const esAgrupable = it.tipo === "Recaudo" || it.tipo === "Ajuste";
      const numero = it.numero || "";
      const key =
        esAgrupable && numero
          ? `${it.tipo}:${numero}`
          : `${it.tipo}:__${(it as any).id ?? i}`; // no agrupables → clave única

      if (!map.has(key)) {
        map.set(key, {
          key,
          tipo: it.tipo,
          numero,
          fechaPrimera: fecha,
          vencimiento: venc,
          totalMonto: 0,
          saldoFinal: it.saldo,
          items: [],
        });
        orderKeys.push(key);
      }
      const g = map.get(key)!;
      g.items.push(it);
      g.totalMonto += it.monto;
      g.saldoFinal = it.saldo;
      if (fecha.getTime() < g.fechaPrimera.getTime()) g.fechaPrimera = fecha;
      if (!g.vencimiento && venc) g.vencimiento = venc;
    }

    return orderKeys.map((k) => map.get(k)!);
  })();
  const displayPedidos = (m: MovimientoCliente) => {
    const ids =
      m.pedidosIds && m.pedidosIds.length
        ? m.pedidosIds
        : m.pedidoId
        ? [m.pedidoId]
        : [];
    return ids.length
      ? ids.map((id) => `#${id.slice(0, 5).toUpperCase()}`).join(", ")
      : "—";
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="p-6 text-sm text-muted-foreground">
          Cargando movimientos…
        </div>
      ) : error ? (
        <div className="p-6 text-sm text-red-600">Error: {error}</div>
      ) : (
        <Card className="border-blue-100/60 shadow-sm">
          <CardContent className="p-0">
            {/* 👇 Scroll en la tabla */}
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-blue-50/70 backdrop-blur border-b border-blue-100">
                  <TableRow>
                    <TableHead className="text-left text-xs font-medium text-blue-600 uppercase">
                      Fecha
                    </TableHead>
                    <TableHead className="text-left text-xs font-medium text-blue-600 uppercase">
                      Vencimiento
                    </TableHead>
                    <TableHead className="text-left text-xs font-medium text-blue-600 uppercase">
                      Tipo
                    </TableHead>
                    <TableHead className="text-left text-xs font-medium text-blue-600 uppercase">
                      Descripción
                    </TableHead>
                    <TableHead className="text-left text-xs font-medium text-blue-600 uppercase">
                      Número
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium text-blue-600 uppercase">
                      Monto
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium text-blue-600 uppercase">
                      Saldo
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grupos.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-sm text-muted-foreground"
                      >
                        Sin movimientos
                      </TableCell>
                    </TableRow>
                  ) : (
                    grupos.map((g) => {
                      const fecha = g.fechaPrimera;
                      const venc = g.vencimiento;
                      const esRecaudoONota = g.totalMonto < 0;
                      const puedeExpandirAjuste =
                        g.tipo === "Ajuste" &&
                        g.items.length >= 1 &&
                        Array.isArray((g.items[0] as any).pedidosIdsAjuste) &&
                        (g.items[0] as any).pedidosIdsAjuste.length > 0;

                      const esAgrupado =
                        (g.tipo === "Recaudo" || g.tipo === "Ajuste") &&
                        g.items.length > 1;
                      const esExpandible = esAgrupado || puedeExpandirAjuste;
                      // ===== Fila principal (todas las columnas completas) =====
                      const filaPrincipal = (
                        <TableRow
                          key={g.key}
                          className="hover:bg-blue-50/40 odd:bg-muted/20 even:bg-background transition-colors"
                        >
                          <TableCell className="p-2 text-sm whitespace-nowrap">
                            {fecha.toLocaleDateString("es-CO", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                            })}
                          </TableCell>
                          <TableCell className="p-2 text-sm whitespace-nowrap">
                            {venc
                              ? venc.toLocaleDateString("es-CO", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                })
                              : "—"}
                          </TableCell>
                          <TableCell className="p-2">
                            <Badge
                              variant={getTipoBadgeVariant(g.tipo)}
                              className={cn(
                                "rounded-md",
                                g.tipo === "Factura" &&
                                  "bg-green-200 text-green-800",
                                g.tipo === "Recaudo" &&
                                  "border-red-300 text-red-700 hover:bg-red-50",
                                g.tipo === "Nota crédito" &&
                                  "bg-blue-50 text-blue-800",
                                g.tipo === "Ajuste" && "bg-red-50 text-red-700"
                              )}
                            >
                              {g.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="p-2 text-sm text-muted-foreground">
                            {g.items[0]?.descripcion || "—"}
                          </TableCell>
                          <TableCell className="p-2 text-sm font-mono">
                            <div className="flex items-center justify-between gap-2">
                              <span>
                                {g.numero || g.items[0]?.numero || "—"}
                              </span>
                              {esExpandible && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-600 hover:text-blue-700"
                                  onClick={() => toggle(g.key)}
                                >
                                  {expandido[g.key]
                                    ? "Ocultar"
                                    : "Ver detalles"}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell
                            className={cn(
                              "p-2 text-right tabular-nums font-semibold",
                              esRecaudoONota
                                ? "text-red-700"
                                : g.totalMonto > 0
                                ? "text-green-700"
                                : "text-muted-foreground"
                            )}
                          >
                            {formatValue(g.totalMonto)}
                          </TableCell>
                          <TableCell className="p-2 text-right tabular-nums">
                            {formatValue(g.saldoFinal)}
                          </TableCell>
                        </TableRow>
                      );

                      // Si no es agrupado, solo retornamos la fila principal
                      if (!esExpandible) return filaPrincipal;

                      // ===== Fila de detalles (se muestra sólo al expandir) =====
                      return (
                        <React.Fragment key={g.key}>
                          {filaPrincipal}
                          {expandido[g.key] && (
                            <TableRow className="bg-blue-50/30">
                              <TableCell colSpan={7} className="p-3">
                                <div className="space-y-1">
                                  <div className="space-y-1">
                                    {/* CASO ESPECIAL: Ajuste con 1 item y pedidosIdsAjuste */}
                                    {g.tipo === "Ajuste" &&
                                    g.items.length === 1 &&
                                    Array.isArray(
                                      (g.items[0] as any).pedidosIdsAjuste
                                    ) &&
                                    (g.items[0] as any).pedidosIdsAjuste
                                      .length > 0 ? (
                                      (() => {
                                        const base = g.items[0];

                                        const f =
                                          typeof base.fecha === "string"
                                            ? new Date(base.fecha)
                                            : (base.fecha as Date);

                                        // ✔ Preferimos el arreglo con {pedidoId, valor}
                                        const ajusteDetalles = (base as any)
                                          .ajusteDetalles as
                                          | {
                                              pedidoId: string;
                                              valor: number;
                                            }[]
                                          | undefined;

                                        // Si no viniera ajusteDetalles, caemos a solo los IDs (muestra “—” en monto)
                                        const filas = ajusteDetalles?.length
                                          ? ajusteDetalles.map((d) => ({
                                              pedidoId: d.pedidoId,
                                              valor: -Math.abs(
                                                Number(d.valor || 0)
                                              ), // ajustes como negativo
                                            }))
                                          : (
                                              (base as any)
                                                .pedidosIdsAjuste as string[]
                                            ).map((pid) => ({
                                              pedidoId: pid,
                                              valor: undefined as
                                                | number
                                                | undefined,
                                            }));

                                        return (
                                          <>
                                            {filas.map((row, idx) => (
                                              <div
                                                key={`${g.key}-aj-${idx}`}
                                                className="grid grid-cols-5 gap-2 text-xs items-center"
                                              >
                                                <span className="text-gray-600">
                                                  {f.toLocaleDateString(
                                                    "es-CO",
                                                    {
                                                      year: "numeric",
                                                      month: "2-digit",
                                                      day: "2-digit",
                                                    }
                                                  )}
                                                </span>

                                                <span className="text-gray-700">
                                                  <Badge className="bg-red-50 text-red-700 rounded-md">
                                                    Ajuste
                                                  </Badge>
                                                </span>

                                                <span className="font-mono text-gray-700">
                                                  Ajuste a la factura:{" "}
                                                  <span className="text-gray-700">
                                                    {row.pedidoId
                                                      ? `#${row.pedidoId
                                                          .slice(0, 5)
                                                          .toUpperCase()}`
                                                      : "—"}
                                                  </span>
                                                </span>

                                                {/* 👉 monto por pedido */}
                                                <span
                                                  className={cn(
                                                    "text-right tabular-nums font-semibold",
                                                    (row.valor ?? 0) < 0
                                                      ? "text-red-700"
                                                      : (row.valor ?? 0) > 0
                                                      ? "text-green-700"
                                                      : "text-muted-foreground"
                                                  )}
                                                >
                                                  {row.valor !== undefined
                                                    ? formatValue(row.valor)
                                                    : "—"}
                                                </span>

                                                {/* saldo: puedes dejar el del item base o quitarlo por fila */}
                                                <span className="text-right tabular-nums text-gray-700">
                                                  {formatValue(base.saldo)}
                                                </span>
                                              </div>
                                            ))}
                                          </>
                                        );
                                      })()
                                    ) : (
                                      /* CASO CLÁSICO… (tu bloque existente) */
                                      <>
                                        {g.items.map((m, idx) => {
                                          const f =
                                            typeof m.fecha === "string"
                                              ? new Date(m.fecha)
                                              : (m.fecha as Date);

                                          const pedidosIds = (m as any)
                                            .pedidosIds as string[] | undefined;
                                          const pedidosIdsAjuste = (m as any)
                                            .pedidosIdsAjuste as
                                            | string[]
                                            | undefined;

                                          const pedidoIdFila =
                                            g.tipo === "Ajuste"
                                              ? Array.isArray(
                                                  pedidosIdsAjuste
                                                ) && pedidosIdsAjuste.length
                                                ? pedidosIdsAjuste[idx]
                                                : undefined
                                              : (Array.isArray(pedidosIds) &&
                                                pedidosIds.length
                                                  ? pedidosIds[idx]
                                                  : undefined) ??
                                                (m.pedidoId || undefined);

                                          const ajusteDetalles = (m as any)
                                            .ajusteDetalles as
                                            | {
                                                pedidoId: string;
                                                valor: number;
                                              }[]
                                            | undefined;

                                          const valorPorPedido =
                                            g.tipo === "Ajuste"
                                              ? (() => {
                                                  if (ajusteDetalles?.length) {
                                                    const byId = pedidoIdFila
                                                      ? ajusteDetalles.find(
                                                          (d) =>
                                                            d.pedidoId ===
                                                            pedidoIdFila
                                                        )?.valor
                                                      : undefined;
                                                    if (byId !== undefined)
                                                      return -Math.abs(
                                                        Number(byId)
                                                      );
                                                    const byIdx =
                                                      ajusteDetalles[idx]
                                                        ?.valor;
                                                    if (byIdx !== undefined)
                                                      return -Math.abs(
                                                        Number(byIdx)
                                                      );
                                                  }
                                                  return m.monto;
                                                })()
                                              : m.monto;

                                          const esNeg = valorPorPedido < 0;

                                          return (
                                            <div
                                              key={`${g.key}-${idx}`}
                                              className="grid grid-cols-5 gap-2 text-xs items-center"
                                            >
                                              <span className="text-gray-600">
                                                {f.toLocaleDateString("es-CO", {
                                                  year: "numeric",
                                                  month: "2-digit",
                                                  day: "2-digit",
                                                })}
                                              </span>

                                              <span className="text-gray-700">
                                                <Badge
                                                  variant={getTipoBadgeVariant(
                                                    g.tipo
                                                  )}
                                                  className={cn(
                                                    "rounded-md",
                                                    g.tipo === "Ajuste" &&
                                                      "bg-red-50 text-red-700",
                                                    g.tipo === "Recaudo" &&
                                                      "border-red-300 text-red-700 hover:bg-red-50"
                                                  )}
                                                >
                                                  {g.tipo}
                                                </Badge>
                                              </span>

                                              <span className="font-mono text-gray-700">
                                                {g.tipo === "Ajuste"
                                                  ? "Ajuste a la factura:"
                                                  : "Abono a la factura:"}{" "}
                                                <span className="text-gray-700">
                                                  {pedidoIdFila
                                                    ? `#${pedidoIdFila
                                                        .slice(0, 5)
                                                        .toUpperCase()}`
                                                    : "—"}
                                                </span>
                                              </span>

                                              <span
                                                className={cn(
                                                  "text-right tabular-nums font-semibold",
                                                  esNeg
                                                    ? "text-red-700"
                                                    : valorPorPedido > 0
                                                    ? "text-green-700"
                                                    : "text-muted-foreground"
                                                )}
                                              >
                                                {formatValue(valorPorPedido)}
                                              </span>

                                              <span className="text-right tabular-nums text-gray-700">
                                                {formatValue(m.saldo)}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={exportarExcel}
          disabled={loading || items.length === 0}
          className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
          title={
            loading
              ? "Cargando..."
              : items.length === 0
              ? "Sin movimientos para exportar"
              : "Exportar Excel"
          }
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exportar Excel
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="border-blue-500 text-blue-600 hover:bg-blue-50"
          onClick={onClose}
        >
          <X className="mr-2 h-4 w-4" />
          Cerrar
        </Button>
      </div>
    </div>
  );
}

// =============== Actions (ver detalles / historial) ===============
function ClienteActions({ cliente }: { cliente: ClienteConSaldo }) {
  const [open, setOpen] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menú</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <Eye className="mr-2 h-4 w-4" /> Ver detalles
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenHistory(true)}>
            <Eye className="mr-2 h-4 w-4" /> Ver historial
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2" /> Detalles del Cliente
            </DialogTitle>
            <DialogDescription>
              Información de {cliente.nombre}
            </DialogDescription>
          </DialogHeader>
          <ClienteDetalles cliente={cliente} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={openHistory} onOpenChange={setOpenHistory}>
        <DialogContent className="max-w-5xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2" /> Historial de movimientos
            </DialogTitle>
            <DialogDescription>
              Facturas y recaudos de {cliente.nombre}
            </DialogDescription>
          </DialogHeader>
          <ClienteHistorial
            clienteId={cliente.idCliente}
            clienteNombre={cliente.nombre}
            onClose={() => setOpenHistory(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// =============== Columns (export principal) ===============
export const columns: ColumnDef<ClienteConSaldo>[] = [
  {
    accessorKey: "nombre",
    header: ({ column }: { column: Column<ClienteConSaldo, unknown> }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 px-2 lg:px-3"
      >
        Cliente
      </Button>
    ),
    cell: ({ row }) => {
      const { nombre, identificacion } = row.original;
      return (
        <div className="space-y-1">
          <div className="font-medium">{nombre}</div>
          {identificacion && (
            <div className="text-xs text-muted-foreground">
              ID {identificacion}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "ciudad",
    header: "Ciudad",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.ciudad ?? "—"}</span>
    ),
  },
  {
    accessorKey: "telefono",
    header: "Teléfono",
    cell: ({ row }) => (
      <span className="font-mono">{row.original.telefono ?? "—"}</span>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.email ?? "—"}</span>
    ),
  },
  {
    accessorKey: "saldoPendienteCOP",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 px-2 lg:px-3"
      >
        Saldo (COP)
      </Button>
    ),
    cell: ({ row }) => (
      <span
        className={cn(
          "font-semibold tabular-nums",
          row.original.saldoPendienteCOP > 0
            ? "text-amber-700"
            : row.original.saldoPendienteCOP < 0
            ? "text-green-700"
            : "text-muted-foreground"
        )}
      >
        {formatValue(row.original.saldoPendienteCOP)}
      </span>
    ),
    enableSorting: true,
  },

  {
    id: "actions",
    header: () => <div className="text-right">Acciones</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <ClienteActions cliente={row.original} />
      </div>
    ),
  },
];
