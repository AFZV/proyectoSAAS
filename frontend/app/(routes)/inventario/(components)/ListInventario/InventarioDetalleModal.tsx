// app/(routes)/inventario/(components)/ListInventario/InventarioDetalleModal.tsx
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
import { Loader2, X, Download, Filter, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { ArrowUp, ArrowDown } from "lucide-react";

interface Movimiento {
  tipoMovimiento: string;
  nombreProducto: string;
  precioCompra: number;
  usuario: string;
  cantidadMovimiendo: number;
  fecha: string;
  observacion: string;
  stockActual?: number;
  stock?: number; // Agregado para mostrar el stock resultante
}

interface InventarioDetalleModalProps {
  open: boolean;
  onClose: () => void;
  producto: {
    id: string;
    nombre: string;
    precioCompra: number;
    fechaCreado: string;
    inventario: { stockReferenciaOinicial: number; stockActual?: number }[];
  };
}

export function InventarioDetalleModal({
  open,
  onClose,
  producto,
}: InventarioDetalleModalProps) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [filteredMovimientos, setFilteredMovimientos] = useState<Movimiento[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const { getToken } = useAuth();

  useEffect(() => {
    if (!open) {
      setMovimientos([]);
      setFilteredMovimientos([]);
      setError(null);
      setFiltroTipo("todos");
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error("Token de autenticación no disponible");

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/inventario/movimientos/${producto.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

        const { movimientos } = await res.json();
        const movimientosData = movimientos || [];
        setMovimientos(movimientosData);
        setFilteredMovimientos(movimientosData);
        console.log("movimientos que llegan", movimientos);
        console.log("movimientos filtrados:", filteredMovimientos);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, producto.id, getToken]);

  // Filtrar movimientos
  useEffect(() => {
    if (filtroTipo === "todos") {
      setFilteredMovimientos(movimientos);
    } else {
      const filtered = movimientos.filter((m) =>
        m.tipoMovimiento.toLowerCase().includes(filtroTipo.toLowerCase())
      );
      setFilteredMovimientos(filtered);
    }
  }, [filtroTipo, movimientos]);

  const fmt = (s: string) =>
    new Date(s).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getMovimientoColor = (tipo: string) => {
    const t = tipo.toLowerCase();
    if (t.includes("entrada"))
      return "bg-green-100 text-green-800 border-green-200";
    if (t.includes("salida")) return "bg-red-100 text-red-800 border-red-200";
    if (t.includes("ajuste"))
      return "bg-blue-100 text-blue-800 border-blue-200";
    if (t.includes("compra"))
      return "bg-purple-100 text-purple-800 border-purple-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const tiposUnicos = [
    "todos",
    ...Array.from(new Set(movimientos.map((m) => m.tipoMovimiento))),
  ];

  const exportarExcel = () => {
    // Crear datos para el Excel con información del producto
    const datosProducto = [
      ["CARDEX DE INVENTARIO"],
      [""],
      ["Producto:", producto.nombre],
      [
        "Precio de Compra:",
        `$ ${producto.precioCompra.toLocaleString("es-CO")}`,
      ],
      [
        "Stock Inicial:",
        (producto.inventario?.[0]?.stockReferenciaOinicial || 0).toLocaleString(
          "es-CO"
        ),
      ],
      [
        "Stock Actual:",
        (producto.inventario?.[0]?.stockActual || 0).toLocaleString("es-CO"),
      ],
      ["Fecha de Creación:", fmt(producto.fechaCreado)],
      ["Total de Movimientos:", filteredMovimientos.length.toString()],
      ["Fecha de Reporte:", new Date().toLocaleDateString("es-CO")],
      [""],
      ["MOVIMIENTOS DE INVENTARIO"],
    ];

    // Headers de la tabla
    const headers = [
      "Fecha",
      "Tipo de Movimiento",
      "Precio Unitario",
      "Cantidad",
      "Stock Resultante",
      "Usuario",
      "Observación",
    ];

    // Datos de movimientos
    const datosMovimientos = filteredMovimientos.map((m) => [
      fmt(m.fecha),
      m.tipoMovimiento,
      m.precioCompra,
      m.cantidadMovimiendo,
      m.stock || 0,
      m.usuario,
      m.observacion || "",
    ]);

    // Combinar todos los datos
    const datosCompletos = [
      ...datosProducto,
      [""], // Fila vacía
      headers,
      ...datosMovimientos,
    ];

    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(datosCompletos);

    // Configurar anchos de columnas
    const colWidths = [
      { wch: 35 }, // Fecha
      { wch: 25 }, // Tipo de Movimiento
      { wch: 15 }, // Precio
      { wch: 12 }, // Cantidad
      { wch: 15 }, // Stock Resultante
      { wch: 20 }, // Usuario
      { wch: 30 }, // Observación
    ];
    ws["!cols"] = colWidths;

    // Estilos para el header del producto
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");

    // Aplicar formato a la primera fila (título)
    if (ws["A1"]) {
      ws["A1"].s = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: "center" },
      };
    }

    // Aplicar formato a los headers de la tabla (fila donde están los headers)
    const headerRow = datosProducto.length + 2; // +2 por la fila vacía y el índice base 1
    for (let col = 0; col < headers.length; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: headerRow, c: col });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "F3F4F6" } },
          alignment: { horizontal: "center" },
        };
      }
    }

    // Agregar la hoja al workbook
    XLSX.utils.book_append_sheet(wb, ws, "Cardex");

    // Generar y descargar el archivo
    const fecha = new Date().toISOString().split("T")[0];
    const nombreArchivo = `Cardex_${producto.nombre.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}_${fecha}.xlsx`;

    XLSX.writeFile(wb, nombreArchivo);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => !newOpen && onClose()}>
      <DialogContent className="max-w-7xl max-h-[90vh] w-[95vw] p-0 gap-0">
        {/* Header fijo */}
        <div className="sticky top-0 bg-white border-b p-6 z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-gray-900">
                kardex de Inventario
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                {producto.nombre}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute top-4 right-4 z-20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Información del producto - Layout compacto */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-gray-500">Precio Compra</p>
              <p className="font-semibold text-sm">
                $ {producto.precioCompra.toLocaleString("es-CO")}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Stock Inicial</p>
              <p className="font-semibold text-sm">
                {(
                  producto.inventario?.[0]?.stockReferenciaOinicial || 0
                ).toLocaleString("es-CO")}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Stock Actual</p>
              <p className="font-semibold text-sm">
                {(producto.inventario?.[0]?.stockActual || 0).toLocaleString(
                  "es-CO"
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Fecha Creación</p>
              <p className="font-semibold text-sm">
                {fmt(producto.fechaCreado)}
              </p>
            </div>
          </div>

          {/* Controles */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1"
                >
                  {tiposUnicos.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo === "todos" ? "Todos los tipos" : tipo}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-sm text-gray-600">
                {filteredMovimientos.length} de {movimientos.length} movimientos
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportarExcel}
              disabled={filteredMovimientos.length === 0}
              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin mr-2 h-5 w-5" />
              <span>Cargando movimientos...</span>
            </div>
          )}

          {error && (
            <div className="mx-6 my-4 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800 text-sm">Error: {error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              {filteredMovimientos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <p className="text-lg">No hay movimientos registrados</p>
                  <p className="text-sm">
                    Para este producto o filtro seleccionado
                  </p>
                </div>
              ) : (
                <div className="overflow-auto max-h-[50vh]">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-gray-50 border-b">
                      <tr>
                        {[
                          "Fecha",
                          "Tipo",
                          "Cantidad",
                          "Stock",
                          "Usuario",
                          "Observación",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {filteredMovimientos.map((m, i) => (
                        <tr
                          key={i}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm text-gray-600 w-1/6">
                            {fmt(m.fecha)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`
                                px-2 py-1 rounded-full text-xs font-medium border
                                ${getMovimientoColor(m.tipoMovimiento)}
                              `}
                            >
                              {m.tipoMovimiento}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-center flex items-center justify-center space-x-1">
                            {m.tipoMovimiento
                              .toLowerCase()
                              .includes("salida") ? (
                              <>
                                <span className="text-red-600 font-bold">
                                  –
                                </span>
                                <span className="text-red-600">
                                  {m.cantidadMovimiendo.toLocaleString("es-CO")}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-green-600 font-bold">
                                  +
                                </span>
                                <span className="text-green-600">
                                  {m.cantidadMovimiendo.toLocaleString("es-CO")}
                                </span>
                              </>
                            )}
                          </td>

                          <td className="px-4 py-3 text-sm text-gray-900 text-left">
                            {(m.stock || 0).toLocaleString("es-CO")}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {m.usuario}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 w-2/5 break-words">
                            {m.observacion || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer opcional con estadísticas */}
        {!loading && !error && filteredMovimientos.length > 0 && (
          <div className="border-t bg-gray-50 px-6 py-3">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Total de movimientos: {filteredMovimientos.length}</span>
              <span>
                Última actualización:{" "}
                {filteredMovimientos.length > 0
                  ? fmt(filteredMovimientos[0].fecha)
                  : "N/A"}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
