"use client";

import { useMemo, useState, useEffect } from "react";
import { AlarmClock, Building2, CalendarClock, FileText } from "lucide-react";

type VencimientoFacturaProveedor = {
  idFacturaProveedor: string;
  numero: string;
  fechaEmision: string;
  fechaVencimiento: string;
  total: number;
  saldo: number;
  moneda: "COP" | "USD" | "CNY" | string;
  estado?: string | null;
  tasaCambio?: number | null;
  proveedor: {
    razonsocial: string;
    identificacion?: string | null;
  };
  diasRestantes?: number;
};

const fmtDateLocal = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 10);
};

const fmtMoney = (v: number, currency: string = "COP") => {
  const maps: Record<string, Intl.NumberFormat> = {
    COP: new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }),
    USD: new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }),
    CNY: new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 2,
    }),
  };
  const nf =
    maps[currency] ??
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" });
  return nf.format(v || 0);
};

export default function VencimientosTable({
  data,
}: {
  data: VencimientoFacturaProveedor[];
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  // Si cambia pageSize o llega nueva data, asegurar page válida
  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const pageData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, safePage, pageSize]);

  const from = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, totalItems);

  return (
    <section className="min-h-screen bg-background text-foreground px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-card rounded-lg border overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/20">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlarmClock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Vencimientos de facturas de proveedor
              </h2>
              <div className="text-sm text-muted-foreground">
                {totalItems > 0
                  ? `${totalItems} factura(s)`
                  : "Sin facturas por vencer"}
              </div>
            </div>
          </div>

          {/* Tabla */}
          {totalItems > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">
                        Proveedor
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        N° Factura
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Emisión
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Vencimiento
                      </th>
                      <th className="text-left px-4 py-3 font-medium">Días</th>
                      <th className="text-right px-4 py-3 font-medium">
                        Total
                      </th>
                      <th className="text-right px-4 py-3 font-medium">
                        Saldo
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Moneda
                      </th>
                    </tr>
                  </thead>

                  <tbody className="[&>tr:nth-child(odd)]:bg-muted/20">
                    {pageData.map((f) => {
                      const dias = f.diasRestantes ?? 0;
                      const vencida = dias < 0;
                      const hoy = dias === 0;

                      const badgeBase =
                        "inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium";
                      const badgeClass = vencida
                        ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800"
                        : hoy
                        ? "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-800"
                        : "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800";

                      const diasLabel = vencida
                        ? `Vencida hace ${Math.abs(dias)} día(s)`
                        : hoy
                        ? "Vence hoy"
                        : `Faltan ${dias} día(s)`;

                      return (
                        <tr
                          key={f.idFacturaProveedor}
                          className={`transition-colors hover:bg-muted/40 ${
                            vencida ? "bg-red-50/60 dark:bg-red-950/20" : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <div className="min-w-0">
                                <div className="font-medium truncate">
                                  {f.proveedor?.razonsocial || "—"}
                                </div>
                                {f.proveedor?.identificacion && (
                                  <div className="text-xs text-muted-foreground">
                                    NIT {f.proveedor.identificacion}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <span className="font-mono">{f.numero}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            {fmtDateLocal(f.fechaEmision)}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <CalendarClock className="w-4 h-4 text-muted-foreground" />
                              <span
                                className={
                                  vencida
                                    ? "font-semibold text-red-600 dark:text-red-400"
                                    : ""
                                }
                              >
                                {fmtDateLocal(f.fechaVencimiento)}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <span className={`${badgeBase} ${badgeClass}`}>
                              {diasLabel}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right font-medium font-mono">
                            {fmtMoney(f.total, f.moneda || "COP")}
                          </td>

                          <td
                            className={`px-4 py-3 text-right font-semibold font-mono ${
                              vencida ? "text-red-700 dark:text-red-400" : ""
                            }`}
                          >
                            {fmtMoney(f.saldo, f.moneda || "COP")}
                          </td>

                          <td className="px-4 py-3">
                            <span className="text-xs uppercase tracking-wide text-muted-foreground">
                              {f.moneda || "COP"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINADOR */}
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between p-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Mostrando{" "}
                  <span className="font-medium text-foreground">{from}</span> -{" "}
                  <span className="font-medium text-foreground">{to}</span> de{" "}
                  <span className="font-medium text-foreground">
                    {totalItems}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}/página
                      </option>
                    ))}
                  </select>

                  <button
                    className="h-9 px-3 rounded-md border text-sm disabled:opacity-50"
                    disabled={safePage === 1}
                    onClick={() => setPage(1)}
                  >
                    «
                  </button>
                  <button
                    className="h-9 px-3 rounded-md border text-sm disabled:opacity-50"
                    disabled={safePage === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </button>

                  <div className="text-sm px-2">
                    {safePage} / {totalPages}
                  </div>

                  <button
                    className="h-9 px-3 rounded-md border text-sm disabled:opacity-50"
                    disabled={safePage === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Siguiente
                  </button>
                  <button
                    className="h-9 px-3 rounded-md border text-sm disabled:opacity-50"
                    disabled={safePage === totalPages}
                    onClick={() => setPage(totalPages)}
                  >
                    »
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center bg-blue-50 dark:bg-blue-950/20">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlarmClock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                No hay facturas por vencer
              </h3>
              <p className="text-blue-700 dark:text-blue-300">
                Cuando existan facturas próximas al vencimiento o vencidas,
                aparecerán aquí.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
