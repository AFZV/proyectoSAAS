"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Loader2, X, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import React from "react";

interface MovimientoCartera {
  fecha: string;
  valorMovimiento: number;
  tipoMovimiento: string;
  referencia: string;
  pedidoId?: string | null; // 👈 NUEVO: id del pedido afectado, si aplica
}

interface Cliente {
  id: string;
  nombre: string;
  apellidos?: string;
  razonSocial?: string;
  nit: string;
}

interface CarteraDetalleModalProps {
  open: boolean;
  onClose: () => void;
  cliente: Cliente;
}

export function CarteraDetalleModal({
  open,
  onClose,
  cliente,
}: CarteraDetalleModalProps) {
  const [movimientos, setMovimientos] = useState<MovimientoCartera[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});
  const toggle = (k: string) =>
    setExpandido((prev) => ({ ...prev, [k]: !prev[k] }));

  const fmt = (s: string) =>
    new Date(s).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  useEffect(() => {
    if (!open) return;

    (async () => {
      setLoading(true);
      try {
        const token = await getToken();
        if (!token) throw new Error("Token no disponible");

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/balance/movimientos/${cliente.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

        const data = await res.json();

        setMovimientos(data.movimientos || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, cliente.id, getToken]);

  const exportarExcel = () => {
    const datosCliente = [
      ["DETALLE DE CARTERA"],
      [""],
      [
        "Cliente:",
        `${cliente.nombre} ${cliente.apellidos || cliente.razonSocial || ""}`,
      ],
      ["NIT:", cliente.nit],
      ["Fecha de Reporte:", new Date().toLocaleDateString("es-CO")],
      [""],
      ["MOVIMIENTOS DE CARTERA"],
    ];

    const headers = ["Fecha", "Tipo", "Valor", "Origen"];
    const datos = movimientos.map((m) => [
      fmt(m.fecha),
      m.tipoMovimiento,
      m.valorMovimiento,
      m.referencia,
    ]);

    const sheet = XLSX.utils.aoa_to_sheet([
      ...datosCliente,
      [""],
      headers,
      ...datos,
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Cartera");
    XLSX.writeFile(wb, `Cartera_${cliente.nombre}_${cliente.nit}.xlsx`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Detalle de Cartera</DialogTitle>
          <DialogDescription>
            Cliente: {cliente.nombre}{" "}
            {cliente.apellidos || cliente.razonSocial || ""} | NIT:{" "}
            {cliente.nit}
          </DialogDescription>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-4 right-4"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>Cargando movimientos...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-100 border border-red-200 rounded-md text-red-700">
            Error: {error}
          </div>
        ) : movimientos.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            No hay movimientos registrados
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mt-4 mb-2">
              <span className="text-sm text-gray-600">
                Total movimientos: {movimientos.length}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={exportarExcel}
                className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </div>

            <div className="overflow-auto max-h-[50vh] rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {[
                      "Fecha",
                      "Tipo",
                      "Valor",
                      "Referencia",
                      "Saldo Restante",
                      "Acción",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2 text-left font-medium text-gray-700"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {(() => {
                    // 1) Orden cronológico (antiguos primero)
                    const ordenados = [...movimientos].sort(
                      (a, b) =>
                        new Date(a.fecha).getTime() -
                        new Date(b.fecha).getTime()
                    );

                    type Tipo = "PEDIDO" | "RECIBO" | "AJUSTE_MANUAL" | string;
                    type Grupo = {
                      clave: string;
                      tipo: Tipo;
                      referencia: string;
                      fechaInicio: string;
                      total: number;
                      items: MovimientoCartera[];
                    };

                    // 2) Agrupar SOLO si es RECIBO o AJUSTE_MANUAL; PEDIDO siempre individual
                    const mapa = new Map<string, Grupo>();
                    ordenados.forEach((m, idx) => {
                      const refLimpia = (m.referencia || "").trim();
                      const tipo = m.tipoMovimiento as Tipo;

                      const esAgrupable =
                        tipo === "RECIBO" || tipo === "AJUSTE_MANUAL";

                      // 👇 Clave:
                      // - Agrupable (RECIBO/AJUSTE): agrupa por tipo + referencia
                      // - No agrupable (PEDIDO): fuerza clave única por movimiento
                      const clave = esAgrupable
                        ? `${tipo}:${
                            refLimpia ||
                            (tipo === "RECIBO" ? "RECIBO" : "AJUSTE")
                          }`
                        : `${tipo}:${refLimpia || "PEDIDO"}:${new Date(
                            m.fecha
                          ).getTime()}:${idx}`;

                      if (!mapa.has(clave)) {
                        mapa.set(clave, {
                          clave,
                          tipo,
                          referencia:
                            refLimpia ||
                            (tipo === "RECIBO"
                              ? "RECIBO"
                              : tipo === "AJUSTE_MANUAL"
                              ? "AJUSTE"
                              : "PEDIDO"),
                          fechaInicio: m.fecha,
                          total: 0,
                          items: [],
                        });
                      }

                      const g = mapa.get(clave)!;
                      g.items.push(m);
                      g.total += m.valorMovimiento;
                      if (
                        new Date(m.fecha).getTime() <
                        new Date(g.fechaInicio).getTime()
                      ) {
                        g.fechaInicio = m.fecha;
                      }
                    });

                    // 3) A array + ordenar por fecha de inicio
                    const grupos = Array.from(mapa.values()).sort(
                      (a, b) =>
                        new Date(a.fechaInicio).getTime() -
                        new Date(b.fechaInicio).getTime()
                    );

                    // 4) Saldo acumulado por grupo (muestra el saldo después de cada grupo)
                    let saldoAcumulado = 0;

                    const renderBadge = (tipo: string) => (
                      <span
                        className={`px-3 py-1 rounded-full text-white text-xs font-semibold ${
                          tipo === "PEDIDO"
                            ? "bg-green-500"
                            : tipo === "RECIBO"
                            ? "bg-red-500"
                            : "bg-blue-500"
                        }`}
                      >
                        {tipo === "PEDIDO"
                          ? "Cargo"
                          : tipo === "RECIBO"
                          ? "Abono"
                          : "Ajuste"}
                      </span>
                    );

                    return grupos.map((g) => {
                      // signo/color por grupo
                      let signo = "";
                      let colorValor = "";
                      if (g.tipo === "PEDIDO") {
                        saldoAcumulado += g.total; // cargo suma
                        signo = "+";
                        colorValor = "text-green-600";
                      } else if (g.tipo === "RECIBO") {
                        saldoAcumulado -= g.total; // abono resta
                        signo = "-";
                        colorValor = "text-red-600";
                      } else {
                        // AJUSTE_MANUAL (tu lógica: resta)
                        saldoAcumulado -= g.total;
                        signo = "-";
                        colorValor = "text-blue-600";
                      }

                      const refLabel =
                        g.tipo === "PEDIDO"
                          ? `Pedido #${g.referencia.slice(0, 6)}`
                          : g.tipo === "RECIBO"
                          ? `Recibo #${g.referencia.slice(0, 6)}`
                          : g.referencia && g.referencia !== "AJUSTE"
                          ? `Ajuste #${g.referencia.slice(0, 6)}`
                          : "Ajuste manual";

                      const tieneMultiples = g.items.length > 1; // 👈 solo colapsable cuando hay varios (recibo multi-pedido o ajuste multi-pedido)

                      return (
                        <React.Fragment key={g.clave}>
                          {/* Fila principal */}
                          <tr className="border-b hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2">{fmt(g.fechaInicio)}</td>
                            <td className="px-4 py-2">{renderBadge(g.tipo)}</td>
                            <td
                              className={`px-4 py-2 font-semibold ${colorValor}`}
                            >
                              {signo}${g.total.toLocaleString("es-CO")}
                            </td>
                            <td className="px-4 py-2">{refLabel}</td>
                            <td
                              className={`px-4 py-2 font-semibold ${
                                saldoAcumulado < 0
                                  ? "text-green-700"
                                  : "text-black"
                              }`}
                            >
                              ${saldoAcumulado.toLocaleString("es-CO")}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {tieneMultiples ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggle(g.clave)}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  {expandido[g.clave]
                                    ? "Ocultar"
                                    : "Ver detalles"}
                                </Button>
                              ) : null}
                            </td>
                          </tr>

                          {/* Detalle expandible: SOLO cuando hay múltiples items */}
                          {tieneMultiples && expandido[g.clave] && (
                            <tr className="bg-gray-50">
                              <td colSpan={6} className="px-6 py-3">
                                <div className="space-y-2">
                                  {g.items.map((m, idx) => {
                                    const esCargo =
                                      m.tipoMovimiento === "PEDIDO";
                                    const esAbono =
                                      m.tipoMovimiento === "RECIBO";
                                    const esAjuste =
                                      m.tipoMovimiento === "AJUSTE_MANUAL";

                                    const colorDetalle = esCargo
                                      ? "text-green-600"
                                      : esAbono
                                      ? "text-red-600"
                                      : "text-blue-600";

                                    const labelDetalle = esCargo
                                      ? "Cargo"
                                      : esAbono
                                      ? "Abono"
                                      : "Ajuste";
                                    const signoDetalle = esCargo ? "+" : "-";

                                    // 👇 NUEVO: cuando es ajuste o recibo, preferimos mostrar el pedido afectado
                                    const refDetalle = esCargo
                                      ? `Pedido #${(m.referencia || "").slice(
                                          0,
                                          6
                                        )}`
                                      : esAbono || esAjuste
                                      ? m.pedidoId
                                        ? `Pedido #${m.pedidoId.slice(0, 6)}`
                                        : "Pedido afectado"
                                      : "—";

                                    return (
                                      <div
                                        key={`${g.clave}-${idx}`}
                                        className="grid grid-cols-4 gap-2 text-xs items-center"
                                      >
                                        <span className="text-gray-600">
                                          {fmt(m.fecha)}
                                        </span>
                                        <span>
                                          <span
                                            className={`px-2 py-0.5 rounded-full text-white text-[10px] font-medium ${
                                              esCargo
                                                ? "bg-green-500"
                                                : esAbono
                                                ? "bg-red-500"
                                                : "bg-blue-500"
                                            }`}
                                          >
                                            {labelDetalle}
                                          </span>
                                        </span>
                                        <span
                                          className={`tabular-nums font-semibold ${colorDetalle}`}
                                        >
                                          {signoDetalle}$
                                          {m.valorMovimiento.toLocaleString(
                                            "es-CO"
                                          )}
                                        </span>
                                        <span className="text-gray-600">
                                          {refDetalle}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
