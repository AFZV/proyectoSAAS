// components/Inventario/ListInventario/InventarioDetalleModal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface Movimiento {
  tipoMovimiento: string;
  nombreProducto: string;
  precioCompra: number;
  usuario: string;
  cantidadMovimiendo: number;
  fecha: string;
  observacion: string;
}

interface InventarioDetalleModalProps {
  open: boolean;
  onClose: () => void;
  producto: {
    id: string;
    nombre: string;
    precioCompra: number;
    fechaCreado: string;
    inventario: { stockReferenciaOinicial: number }[];
  };
}

export function InventarioDetalleModal({
  open,
  onClose,
  producto,
}: InventarioDetalleModalProps) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    if (!open) {
      setMovimientos([]);
      setError(null);
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
        setMovimientos(movimientos || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, producto.id, getToken]);

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
    if (t.includes("entrada")) return "bg-green-500";
    if (t.includes("salida")) return "bg-red-500";
    if (t.includes("ajuste")) return "bg-blue-500";
    if (t.includes("compra")) return "bg-purple-500";
    return "bg-gray-500";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="
          bg-card text-foreground 
          dark:bg-gray-800 dark:text-gray-100
          rounded-lg border 
          p-6 max-w-6xl w-full mx-auto
          shadow-lg
        "
      >
        <DialogHeader className="p-0">
          <DialogTitle className="text-2xl font-bold">
            Cardex de: {producto.nombre}
          </DialogTitle>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="grid grid-cols-3 gap-6 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Precio Compra</p>
            <p className="text-lg">$ {producto.precioCompra.toLocaleString("es-CO")}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Stock Inicial</p>
            <p className="text-lg">
              {producto.inventario?.[0]?.stockReferenciaOinicial.toLocaleString("es-CO") || "0"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Stock Actual</p>
            <p className="text-lg">
              {producto.inventario?.[0]?.stockActual.toLocaleString("es-CO") || "0"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fecha Creación</p>
            <p className="text-lg">{fmt(producto.fechaCreado)}</p>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin mr-2" /> Cargando movimientos...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <h4 className="text-lg font-semibold mb-4">
              Movimientos ({movimientos.length})
            </h4>

            {movimientos.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No hay movimientos registrados para este producto
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      {[
                        "Fecha",
                        "Tipo",                        
                        "Precio",
                        "Stock Inicial",
                        "Stock Actual",                        
                        "Usuario",
                        "Cantidad",
                        "Observación",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2 text-left text-sm font-medium"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((m, i) => (
                      <tr key={i} className="border-b last:border-b-0">
                        <td className="px-4 py-3 text-sm">{fmt(m.fecha)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`
                              px-2 py-1 rounded text-xs font-medium text-white
                              ${getMovimientoColor(m.tipoMovimiento)}
                            `}
                          >
                            {m.tipoMovimiento}
                          </span>
                        </td>                        
                        <td className="px-4 py-3 text-right text-sm">
                          $ {m.precioCompra.toLocaleString("es-CO")}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          {producto.inventario?.[0]?.stockReferenciaOinicial.toLocaleString("es-CO") || "0"}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          {m.stockActual.toLocaleString("es-CO") || "0"}
                        </td>
                    
                        <td className="px-4 py-3 text-sm">{m.usuario}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium">
                          {m.cantidadMovimiendo > 0 ? "+" : ""}
                          {m.cantidadMovimiendo.toLocaleString("es-CO")}
                        </td>
                        <td className="px-4 py-3 text-sm">
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
      </DialogContent>
    </Dialog>
  );
}
