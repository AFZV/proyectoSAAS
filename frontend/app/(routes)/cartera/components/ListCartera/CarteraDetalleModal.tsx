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

interface MovimientoCartera {
  fecha: string;
  valorMovimiento: number;
  tipoMovimiento: string;
  referencia: string;
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
        console.log("movimientos que me llegan al front:", data);
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
                    let saldoAcumulado = 0;
                    const movimientosOrdenados = [...movimientos].reverse(); // más antiguos arriba

                    return movimientosOrdenados.map((m, i) => {
                      let color = "";
                      let signo = "";
                      let valor = m.valorMovimiento;

                      if (m.tipoMovimiento === "PEDIDO") {
                        saldoAcumulado += valor;
                        signo = "+";
                        color = "text-green-600";
                      } else if (m.tipoMovimiento === "RECIBO") {
                        saldoAcumulado -= valor;
                        signo = "-";
                        color = "text-red-600";
                      } else if (m.tipoMovimiento === "AJUSTE_MANUAL") {
                        saldoAcumulado -= valor;
                        signo = "-";
                        color = "text-blue-600";
                      }

                      return (
                        <tr
                          key={i}
                          className="border-b hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-2">{fmt(m.fecha)}</td>
                          <td className="px-4 py-2 font-medium">
                            {m.tipoMovimiento === "PEDIDO"
                              ? "🟩 Cargo"
                              : m.tipoMovimiento === "RECIBO"
                              ? "🟥 Abono"
                              : "🟦 Ajuste"}
                          </td>
                          <td className={`px-4 py-2 font-semibold ${color}`}>
                            {signo}${valor.toLocaleString("es-CO")}
                          </td>
                          <td className="px-4 py-2">
                            {m.tipoMovimiento === "PEDIDO"
                              ? `Pedido #${m.referencia.slice(0, 6)}`
                              : m.tipoMovimiento === "RECIBO"
                              ? `Recibo #${m.referencia.slice(0, 6)}`
                              : "Ajuste manual"}
                          </td>
                          <td
                            className={`px-4 py-2 font-semibold ${
                              saldoAcumulado < 0
                                ? "text-green-700"
                                : "text-black"
                            }`}
                          >
                            ${saldoAcumulado.toLocaleString("es-CO")}
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
  );
}
