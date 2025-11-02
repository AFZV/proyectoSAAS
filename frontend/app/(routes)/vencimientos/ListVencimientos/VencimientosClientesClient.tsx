"use client";

import { useMemo, useState, useEffect } from "react";
import {
  AlarmClock,
  Building2,
  CalendarClock,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Share2,
} from "lucide-react";

type Row = {
  idPedido: string;
  numero: string;
  fechaEmision: string; // ISO
  fechaVencimiento: string; // ISO
  total: number;
  saldo: number;
  cliente: {
    rasonZocial: string;
    nit?: string | null;
    nombre?: string;
    apellidos?: string;
    telefono?: string | "";
    email?: string | "";
  };
  diasRestantes?: number;
  estado?: string | null;
  prioridadCobro?: "ALTA" | "MEDIA" | "BAJA";
  diasEnMora?: number;
};

export function VencimientosClientesClient({
  initialData,
}: {
  initialData: Row[];
}) {
  const [q, setQ] = useState("");
  const [prioridad, setPrioridad] = useState<"" | "ALTA" | "MEDIA" | "BAJA">(
    ""
  );
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(0);
  const buildReminderText = (f: Row) => {
    const nombreCliente =
      f.cliente?.rasonZocial ||
      [f.cliente?.nombre, f.cliente?.apellidos].filter(Boolean).join(" ") ||
      "Cliente";

    const vence = fmtDateLocal(f.fechaVencimiento);
    const emision = fmtDateLocal(f.fechaEmision);
    const dias = typeof f.diasRestantes === "number" ? f.diasRestantes : 0;
    const estaVencida = dias < 0;
    const diasVencidos = Math.max(0, -dias);

    const prioridad =
      f.prioridadCobro === "ALTA"
        ? "🔴 Alta prioridad"
        : f.prioridadCobro === "MEDIA"
        ? "🟠 Prioridad media"
        : "🟢 Prioridad baja";

    // 💌 Mensaje estilizado con Markdown de WhatsApp
    return `
*📄 Recordatorio de pago*

👤 *Cliente:* ${nombreCliente}${
      f.cliente?.nit ? ` • NIT: ${f.cliente.nit}` : ""
    }
💰 *Factura/Pedido:* ${f.numero}
🗓️ *Emisión:* ${emision}
⏰ *Vencimiento:* ${vence} ${
      estaVencida
        ? `(vencida hace ${diasVencidos} día${diasVencidos !== 1 ? "s" : ""})`
        : `(faltan ${dias} día${dias !== 1 ? "s" : ""})`
    }

━━━━━━━━━━━━━━━
💵 *Total:* ${fmtMoney(f.total)}
🏦 *Saldo pendiente:* ${fmtMoney(f.saldo)}
📊 *${prioridad}*
━━━━━━━━━━━━━━━

Estimado/a ${
      nombreCliente.split(" ")[0] || ""
    }, te contactamos para informarte sobre el saldo pendiente de esta factura.  
Por favor, indícanos la fecha estimada de pago o si necesitas asistencia adicional. 🙏  
¡Gracias por tu atención y preferencia, Si ya cancelaste omite este mensaje!
`;
  };

  const isValidCoMobile = (phone?: string) => /^57[3]\d{9}$/.test(phone ?? "");
  const openWhatsApp = (f: Row) => {
    const text = encodeURIComponent(buildReminderText(f));
    const telefono = f.cliente?.telefono || "";

    const url = isValidCoMobile(telefono)
      ? `https://api.whatsapp.com/send?phone=${telefono}&text=${text}`
      : `https://api.whatsapp.com/send?text=${text}`; // fallback sin número

    window.open(url, "_blank", "noopener,noreferrer");
  };

  // sincroniza URL “bonito”
  useEffect(() => {
    const url = new URL(window.location.href);
    if (q) url.searchParams.set("q", q);
    else url.searchParams.delete("q");
    if (prioridad) url.searchParams.set("prioridad", prioridad);
    else url.searchParams.delete("prioridad");
    window.history.replaceState({}, "", url.toString());
  }, [q, prioridad]);

  // filtra
  const data = useMemo(() => {
    const text = q.trim().toLowerCase();
    return initialData.filter((f) => {
      const matchTexto =
        !text ||
        [
          f.cliente?.rasonZocial || "",
          f.cliente?.nit || "",
          f.cliente?.nombre || "",
          f.cliente?.apellidos || "",
          f.numero || "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(text);

      const matchPri = prioridad ? f.prioridadCobro === prioridad : true;
      return matchTexto && matchPri;
    });
  }, [initialData, q, prioridad]);

  // resetea página al cambiar filtros/busqueda
  useEffect(() => {
    setPage(0);
  }, [q, prioridad]);

  // pagina
  const totalRows = data.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = page * PAGE_SIZE;
    return data.slice(start, start + PAGE_SIZE);
  }, [data, page]);

  const rangeStart = totalRows === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min((page + 1) * PAGE_SIZE, totalRows);

  const fmtDateLocal = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60_000);
    return local.toISOString().slice(0, 10);
  };

  const fmtMoney = (v: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(v || 0);

  return (
    <section className="min-h-screen bg-background text-foreground px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-card rounded-lg border overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-950/20">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlarmClock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Vencimientos de facturas de clientes
              </h2>
              <div className="text-sm text-muted-foreground">
                {totalRows > 0
                  ? `${totalRows} factura(s)`
                  : "Sin facturas por vencer"}
              </div>
            </div>

            {/* Filtros */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por razón social, NIT, nombre, apellidos o N° factura…"
                  className="w-full pl-9 pr-3 py-2 border rounded-md bg-background"
                />
              </div>

              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value as any)}
                className="px-3 py-2 border rounded-md bg-background"
                title="Prioridad de cobro"
              >
                <option value="">Todas las prioridades</option>
                <option value="ALTA">Prioridad ALTA</option>
                <option value="MEDIA">Prioridad MEDIA</option>
                <option value="BAJA">Prioridad BAJA</option>
              </select>
            </div>
          </div>

          {/* Tabla */}
          {paginated.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">
                        Cliente
                      </th>
                      <th className="text-left px-4 py-3 font-medium">N°</th>
                      <th className="text-left px-4 py-3 font-medium">
                        Emisión
                      </th>
                      <th className="text-left px-4 py-3 font-medium">Vence</th>
                      <th className="text-left px-4 py-3 font-medium">Días</th>
                      <th className="text-left px-4 py-3 font-medium">
                        Prioridad
                      </th>
                      <th className="text-right px-4 py-3 font-medium">
                        Total
                      </th>
                      <th className="text-right px-4 py-3 font-medium">
                        Saldo
                      </th>
                      <th className="text-right px-4 py-3 font-medium">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&>tr:nth-child(odd)]:bg-muted/20">
                    {paginated.map((f) => {
                      const dias = f.diasRestantes ?? 0;
                      const vencida = dias < 0;
                      const hoy = dias === 0;

                      const badgeBase =
                        "inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium";
                      const badgeDias = vencida
                        ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800"
                        : hoy
                        ? "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-800"
                        : "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800";

                      const diasLabel = vencida
                        ? `Vencida hace ${Math.abs(dias)} día(s)`
                        : hoy
                        ? "Vence hoy"
                        : `Faltan ${dias} día(s)`;

                      const prioridad = f.prioridadCobro || "BAJA";
                      const badgePri =
                        prioridad === "ALTA"
                          ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800"
                          : prioridad === "MEDIA"
                          ? "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-800"
                          : "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800";

                      return (
                        <tr
                          key={f.idPedido}
                          className={`transition-colors hover:bg-muted/40 ${
                            vencida ? "bg-red-50/60 dark:bg-red-950/20" : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <div className="min-w-0">
                                <div className="font-medium truncate">
                                  {f.cliente?.rasonZocial || "—"}
                                </div>
                                {f.cliente?.nit && (
                                  <div className="text-xs text-muted-foreground">
                                    NIT {f.cliente.nit}
                                  </div>
                                )}
                                {(f.cliente?.nombre ||
                                  f.cliente?.apellidos) && (
                                  <div className="text-xs text-muted-foreground">
                                    {f.cliente?.nombre} {f.cliente?.apellidos}
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
                            <span className={`${badgeBase} ${badgeDias}`}>
                              {diasLabel}
                            </span>
                            {f.diasEnMora && f.diasEnMora >= 100 ? (
                              <span className="ml-2 text-[10px] font-semibold text-red-700">
                                +100 días mora
                              </span>
                            ) : null}
                          </td>

                          <td className="px-4 py-3">
                            <span className={`${badgeBase} ${badgePri}`}>
                              {prioridad}
                            </span>
                          </td>
                          <td className="py-3 text-right font-medium font-mono">
                            {fmtMoney(f.total)}
                          </td>

                          <td
                            className={`px-4 py-3 text-right font-semibold font-mono ${
                              vencida ? "text-red-700 dark:text-red-400" : ""
                            }`}
                          >
                            {fmtMoney(f.saldo)}
                          </td>

                          <td className="px-4 py-3 text-right">
                            {(() => {
                              const phoneOk = isValidCoMobile(
                                f.cliente?.telefono
                              );
                              return (
                                <button
                                  onClick={() => openWhatsApp(f)}
                                  disabled={!phoneOk}
                                  className="inline-flex items-center gap-1 border rounded-md px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-muted/50"
                                  title={
                                    phoneOk
                                      ? "Enviar recordatorio por WhatsApp"
                                      : "Sin número móvil válido (Colombia: 57 + 10 dígitos)"
                                  }
                                >
                                  <Share2 className="w-4 h-4" />
                                  Recordatorio
                                </button>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Mostrando {rangeStart}–{rangeEnd} de {totalRows}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex items-center gap-1 border rounded-md px-3 py-1.5 text-sm disabled:opacity-50"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page <= 0}
                    title="Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                  <span className="text-sm tabular-nums">
                    Página {page + 1} de {totalPages}
                  </span>
                  <button
                    className="inline-flex items-center gap-1 border rounded-md px-3 py-1.5 text-sm disabled:opacity-50"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                    title="Siguiente"
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center bg-emerald-50 dark:bg-emerald-950/20">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlarmClock className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-2">
                No hay facturas de clientes por vencer
              </h3>
              <p className="text-emerald-700 dark:text-emerald-300">
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
