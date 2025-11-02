"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Loader2, X, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import React from "react";
import { PedidoModal } from "@/components/PedidoModal";
import { ReciboModal } from "@/components/ReciboModal";
import { AjusteModal } from "@/components/AjusteModal";

interface MovimientoCartera {
  fecha: string;
  valorMovimiento: number;
  tipoMovimiento: "PEDIDO" | "RECIBO" | "AJUSTE_MANUAL" | string;
  referencia: string; // ← usamos esto como ID del recurso
  pedidoId?: string | null; // id de pedido afectado (si aplica en detalle)
  observaciones?: string | null;
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

// ---- Normalizador Pedido (sin imagen/categoría) ----
const toPedidoLite = (raw: any) => ({
  id: raw.id,
  fechaPedido:
    raw.fechaPedido ?? raw.creado ?? raw.fecha ?? new Date().toISOString(),
  cliente: raw.cliente
    ? {
        rasonZocial: raw.cliente.rasonZocial,
        nombre: raw.cliente.nombre,
        apellidos: raw.cliente.apellidos,
        nit: raw.cliente.nit,
      }
    : null,
  usuario: raw.usuario ? { nombre: raw.usuario.nombre } : null,
  productos: (raw.productos ?? raw.detalles ?? []).map((it: any) => ({
    productoId: it.productoId ?? it.producto?.id ?? it.id,
    nombre:
      it.producto?.nombre ?? it.nombre ?? (it.productoId ?? "").slice(0, 6),
    cantidad: it.cantidad ?? 0,
    precio: it.precio ?? it.valorUnitario ?? 0,
  })),
  subtotal: raw.subtotal ?? null,
  flete: raw.flete ?? null,
  total: raw.total ?? 0,
  observaciones: raw.observaciones ?? null,
});

// ---- Normalizador Recibo (sin productos) ----
const toReciboResumen = (raw: any) => ({
  id: raw.id,
  // 👇 usa Fechacrecion del backend
  fecha: raw.Fechacrecion
    ? new Date(raw.Fechacrecion).toISOString()
    : new Date().toISOString(),
  cliente: raw.cliente
    ? {
        rasonZocial: raw.cliente.rasonZocial,
        nombre: raw.cliente.nombre,
        apellidos: raw.cliente.apellidos,
        nit: raw.cliente.nit,
      }
    : null,
  // 👇 mapea desde detalleRecibo (no 'detalles' ni 'pedidos')
  pedidos: (raw.detalleRecibo ?? []).map((d: any) => ({
    id: d.idPedido,
    numero: null, // tu Pedido no tiene 'numero'
    valor: Number(d.valorTotal) || 0,
  })),
  valorTotal: (raw.detalleRecibo ?? []).reduce(
    (acc: number, d: any) => acc + (Number(d.valorTotal) || 0),
    0
  ),
  concepto: raw.concepto ?? null, // ← aquí estaba el problema
});
const toAjusteDTO = (raw: any) => {
  const pedidos =
    raw.pedidos ??
    raw.detalleAjusteCartera?.map((d: any) => ({
      id: d.pedidoId ?? d.id,
      valor: Number(d.valor ?? d.monto ?? 0),
    })) ??
    [];

  const valorTotal =
    typeof raw.valorTotal === "number"
      ? raw.valorTotal
      : pedidos.reduce(
          (acc: number, p: any) => acc + (Number(p.valor) || 0),
          0
        );

  return {
    id: raw.id ?? raw.idMovimientoCartera,
    fecha: raw.fecha ?? raw.creado ?? new Date().toISOString(),
    observaciones: raw.observaciones ?? null,
    esReverso: !!raw.esReverso,
    reversaDeId: raw.reversaDeId ?? null,
    usuario: raw.usuario
      ? {
          id: raw.usuario.id,
          nombre: raw.usuario.nombre,
          apellidos: raw.usuario.apellidos ?? null,
        }
      : null,
    cliente: raw.cliente
      ? {
          id: raw.cliente.id,
          nit: raw.cliente.nit,
          rasonZocial: raw.cliente.rasonZocial ?? null,
          nombre: raw.cliente.nombre ?? null,
          apellidos: raw.cliente.apellidos ?? null,
        }
      : null,
    pedidos,
    valorTotal,
  } as const;
};

type ViewerState =
  | { open: false; tipo?: undefined; id?: undefined }
  | { open: true; tipo: "PEDIDO" | "RECIBO" | "AJUSTE_MANUAL"; id: string };

export function CarteraDetalleModal({
  open,
  onClose,
  cliente,
}: CarteraDetalleModalProps) {
  const [movimientos, setMovimientos] = useState<MovimientoCartera[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  // Confirmación de reverso
  const [confirm, setConfirm] = useState<{
    open: boolean;
    id?: string;
    observacion?: string;
  }>({ open: false });

  // Modal para ver información del recurso (pedido/recibo/ajuste)
  const [viewer, setViewer] = useState<ViewerState>({ open: false });
  const [viewerData, setViewerData] = useState<any>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [reversing, setReversing] = useState<boolean>(false);

  const fmt = (s: string) =>
    new Date(s).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // helper para detectar reverso por observación
  const esReversoObs = (txt?: string | null) =>
    /\bREVERSO_DE:\{/.test(txt ?? "");

  // ------- carga de movimientos
  const fetchMovimientos = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Token no disponible");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/balance/movimientos/${cliente.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setMovimientos(data.movimientos || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    fetchMovimientos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cliente.id]);

  // ------- exportar excel
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

    const headers = ["Fecha", "Tipo", "Valor", "Origen", "Observaciones"];
    const datos = movimientos.map((m) => [
      fmt(m.fecha),
      m.tipoMovimiento,
      m.valorMovimiento,
      m.referencia,
      m.observaciones || "",
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

  // ------- helpers UI
  const groupObservaciones = (items: MovimientoCartera[]) => {
    const obs = items
      .map((m) => (m.observaciones || "").trim())
      .filter(Boolean);
    return obs[0] || "—";
  };
  const truncate = (txt: string, max = 120) =>
    txt.length > max ? txt.slice(0, max - 1) + "…" : txt;

  // ------- reversar ajuste (contra-asiento)
  const handleConfirmReverso = (mov: MovimientoCartera) => {
    // usamos 'referencia' como id del ajuste
    setConfirm({ open: true, id: mov.referencia });
  };

  const doReverso = async () => {
    if (!confirm.id) return;
    try {
      setReversing(true);
      const token = await getToken();
      if (!token) throw new Error("Token no disponible");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/balance/ajustes/${confirm.id}/reversar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            motivo: confirm.observacion || "Reverso desde UI cartera",
          }),
        }
      );
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Error ${res.status}: ${t || res.statusText}`);
      }
      // refrescar movimientos
      await fetchMovimientos();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setConfirm({ open: false });
      setReversing(false);
    }
  };

  // ------- ver recurso (pedido / recibo / ajuste)
  const openViewer = (
    tipo: "PEDIDO" | "RECIBO" | "AJUSTE_MANUAL",
    id: string
  ) => setViewer({ open: true, tipo, id });

  const closeViewer = () => {
    setViewer({ open: false });
    setViewerData(null);
    setViewerError(null);
  };

  useEffect(() => {
    const run = async () => {
      if (!viewer.open || !viewer.id || !viewer.tipo) return;
      setViewerLoading(true);
      setViewerError(null);
      setViewerData(null);
      try {
        const token = await getToken();
        if (!token) throw new Error("Token no disponible");

        const path =
          viewer.tipo === "PEDIDO"
            ? `/pedidos/pedidoPorId/${viewer.id}`
            : viewer.tipo === "RECIBO"
            ? `/recibos/getById/${viewer.id}`
            : `/balance/ajustes/porId/${viewer.id}`;

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        const raw = await res.json();

        if (viewer.tipo === "PEDIDO") {
          setViewerData(toPedidoLite(raw)); // ✅ pedido sin imagen/categoría
        } else if (viewer.tipo === "RECIBO") {
          setViewerData(toReciboResumen(raw)); // ✅ recibo sin productos
        } else {
          // puedes mantener tu JSON simple para ajuste
          setViewerData(toAjusteDTO(raw));
        }
      } catch (e: any) {
        setViewerError(e.message);
      } finally {
        setViewerLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer.open]);

  return (
    <>
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
                        "Observaciones",
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

                      type Tipo =
                        | "PEDIDO"
                        | "RECIBO"
                        | "AJUSTE_MANUAL"
                        | string;
                      type Grupo = {
                        clave: string;
                        tipo: Tipo;
                        referencia: string;
                        fechaInicio: string;
                        total: number;
                        items: MovimientoCartera[];
                        esReverso?: boolean;
                      };

                      // 2) Agrupar RECIBO/AJUSTE; PEDIDO individual
                      const mapa = new Map<string, Grupo>();
                      ordenados.forEach((m, idx) => {
                        const refLimpia = (m.referencia || "").trim();
                        const tipo = m.tipoMovimiento as Tipo;
                        const esAgrupable =
                          tipo === "RECIBO" || tipo === "AJUSTE_MANUAL";
                        const clave = esAgrupable
                          ? `${tipo}:${refLimpia || tipo}`
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
                            esReverso: false,
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
                        if (
                          !g.esReverso &&
                          tipo === "AJUSTE_MANUAL" &&
                          esReversoObs(m.observaciones)
                        ) {
                          g.esReverso = true;
                        }
                      });

                      const grupos = Array.from(mapa.values()).sort(
                        (a, b) =>
                          new Date(a.fechaInicio).getTime() -
                          new Date(b.fechaInicio).getTime()
                      );

                      let saldoAcumulado = 0;

                      const renderBadge = (tipo: string, esRev?: boolean) => (
                        <span
                          className={`px-3 py-1 rounded-full text-white text-xs font-semibold ${
                            tipo === "PEDIDO"
                              ? "bg-green-500"
                              : tipo === "RECIBO"
                              ? "bg-red-500"
                              : esRev
                              ? "bg-purple-600"
                              : "bg-blue-500"
                          }`}
                        >
                          {tipo === "PEDIDO"
                            ? "Cargo"
                            : tipo === "RECIBO"
                            ? "Abono"
                            : esRev
                            ? "Reverso ajuste"
                            : "Ajuste"}
                        </span>
                      );

                      return grupos.map((g) => {
                        // total absoluto del grupo para mostrar importes
                        const totalAbs = g.items.reduce(
                          (acc, it) =>
                            acc + Math.abs(Number(it.valorMovimiento || 0)),
                          0
                        );

                        let delta = 0;
                        let signo = "";
                        let colorValor = "";

                        if (g.tipo === "PEDIDO") {
                          delta = +totalAbs; // cargo suma
                          signo = "+";
                          colorValor = "text-green-600";
                        } else if (g.tipo === "RECIBO") {
                          delta = -totalAbs; // abono resta
                          signo = "-";
                          colorValor = "text-red-600";
                        } else {
                          // AJUSTE_MANUAL
                          if (g.esReverso) {
                            delta = +totalAbs; // reverso suma
                            signo = "+";
                            colorValor = "text-purple-600";
                          } else {
                            delta = -totalAbs; // ajuste normal resta
                            signo = "-";
                            colorValor = "text-blue-600";
                          }
                        }

                        saldoAcumulado += delta;

                        const refLabel =
                          g.tipo === "PEDIDO"
                            ? `Pedido #${g.referencia.slice(0, 6)}`
                            : g.tipo === "RECIBO"
                            ? `Recibo #${g.referencia.slice(0, 6)}`
                            : g.referencia && g.referencia !== "AJUSTE"
                            ? `Ajuste #${g.referencia.slice(0, 6)}`
                            : "Ajuste manual";

                        const obs = groupObservaciones(g.items);

                        return (
                          <tr
                            key={g.clave}
                            className="border-b hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-2">{fmt(g.fechaInicio)}</td>
                            <td className="px-4 py-2">
                              {renderBadge(g.tipo, g.esReverso)}
                            </td>
                            <td
                              className={`px-4 py-2 font-semibold ${colorValor}`}
                            >
                              {signo}${totalAbs.toLocaleString("es-CO")}
                            </td>
                            <td className="px-4 py-2">{refLabel}</td>
                            <td className="px-4 py-2 text-gray-700">
                              {obs?.length
                                ? obs.length > 140
                                  ? obs.slice(0, 139) + "…"
                                  : obs
                                : "—"}
                            </td>
                            <td
                              className={`px-4 py-2 font-semibold ${
                                saldoAcumulado < 0
                                  ? "text-red-700"
                                  : "text-black"
                              }`}
                            >
                              ${saldoAcumulado.toLocaleString("es-CO")}
                            </td>
                            <td className="px-4 py-2 text-right space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  openViewer(
                                    g.tipo as
                                      | "PEDIDO"
                                      | "RECIBO"
                                      | "AJUSTE_MANUAL",
                                    g.referencia
                                  )
                                }
                              >
                                Ver{" "}
                                {g.tipo === "PEDIDO"
                                  ? "pedido"
                                  : g.tipo === "RECIBO"
                                  ? "recibo"
                                  : "ajuste"}
                              </Button>
                              {g.tipo === "AJUSTE_MANUAL" && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    handleConfirmReverso({
                                      fecha: g.fechaInicio,
                                      referencia: g.referencia,
                                      tipoMovimiento: "AJUSTE_MANUAL",
                                      valorMovimiento: g.total,
                                    })
                                  }
                                >
                                  Reversar ajuste
                                </Button>
                              )}
                            </td>
                          </tr>
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

      {/* Confirmación Reverso */}
      <AlertDialog
        open={confirm.open}
        onOpenChange={(v) => setConfirm((p) => ({ ...p, open: v }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reversar ajuste</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción creará un contra-asiento que deshará el efecto del
              ajuste. ¿Confirmas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doReverso} disabled={reversing}>
              {reversing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando…
                </span>
              ) : (
                "Confirmar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PedidoModal
        open={viewer.open && viewer.tipo === "PEDIDO"}
        onClose={closeViewer}
        pedido={viewer.tipo === "PEDIDO" ? viewerData : null}
      />

      <ReciboModal
        open={viewer.open && viewer.tipo === "RECIBO"}
        onClose={closeViewer}
        recibo={viewer.tipo === "RECIBO" ? viewerData : null}
      />
      <AjusteModal
        open={viewer.open && viewer.tipo === "AJUSTE_MANUAL"}
        onClose={closeViewer}
        ajuste={viewer.tipo === "AJUSTE_MANUAL" ? viewerData : null}
      />
      {/* Viewer Modal (Pedido / Recibo / Ajuste) */}
      {/* <Dialog open={viewer.open} onOpenChange={(v) => !v && closeViewer()}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {viewer.tipo === "PEDIDO"
                ? `Pedido`
                : viewer.tipo === "RECIBO"
                ? `Recibo`
                : `Ajuste`}
              {viewer.id ? ` #${String(viewer.id).slice(0, 8)}` : ""}
            </DialogTitle>
            <DialogDescription>
              Detalle del recurso consultado desde el backend.
            </DialogDescription>
          </DialogHeader>

          {viewerLoading ? (
            <div className="flex items-center text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Cargando…
            </div>
          ) : viewerError ? (
            <div className="p-3 text-sm bg-red-100 border border-red-200 text-red-700 rounded">
              {viewerError}
            </div>
          ) : viewerData ? (
            <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto">
              {JSON.stringify(viewerData, null, 2)}
            </pre>
          ) : (
            <div className="text-sm text-gray-500">Sin datos</div>
          )}
        </DialogContent>
      </Dialog> */}
      <Dialog open={reversing} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Reversando ajuste…</DialogTitle>
            <DialogDescription>
              Estamos aplicando el contra-asiento y actualizando el historial.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-sm text-gray-700">
              Por favor espera un momento…
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
