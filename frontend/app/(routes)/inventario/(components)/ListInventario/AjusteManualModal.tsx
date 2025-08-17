// app/(routes)/inventario/(components)/ListInventario/AjusteManualModal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface TipoMovimiento {
  idTipoMovimiento: string;
  tipo: string;
}

interface AjusteManualModalProps {
  open: boolean;
  onClose: () => void;
  producto: {
    id: string;
    nombre: string;
    inventario: { stockReferenciaOinicial: number; stockActual?: number }[];
  };
}

export function AjusteManualModal({
  open,
  onClose,
  producto,
}: AjusteManualModalProps) {
  const [tipos, setTipos] = useState<TipoMovimiento[]>([]);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string>("");
  const [cantidad, setCantidad] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [observacion, setObservacion] = useState<string>("");
  const { getToken } = useAuth();

  // Obtener stocks del producto
  const stockInicial = producto.inventario?.[0]?.stockReferenciaOinicial ?? 0;
  const stockActual = producto.inventario?.[0]?.stockActual ?? 0;

  // Resetear estado cuando se cierra el modal
  useEffect(() => {
    if (!open) {
      setTipoSeleccionado("");
      setCantidad(0);
      setTipos([]);
    }
  }, [open]);

  // Cargar tipos de movimiento
  useEffect(() => {
    if (!open) return;

    const cargarTipos = async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No se obtuvo token");

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/inventario/tiposmov`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) throw new Error("Error al obtener tipos de movimiento");

        const data = await res.json();
        setTipos(Array.isArray(data.tiposmov) ? data.tiposmov : []);
      } catch (err) {
        console.error("Error cargando tipos de movimiento:", err);
        setTipos([]);
      }
    };

    cargarTipos();
  }, [open, getToken]);

  const handleSubmit = async () => {
    if (!tipoSeleccionado || cantidad <= 0) return;

    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No se obtuvo token");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/inventario/update/${producto.id}/${tipoSeleccionado}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            stockActual: cantidad,
            observacion: observacion,
          }),
        }
      );

      if (!res.ok) throw new Error("Error en la actualización");

      // Cerrar modal y auto-refresh
      onClose();
    } catch (error) {
      console.error("Error al ajustar inventario:", error);
      alert("Error al realizar el ajuste. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  // Prevenir cierre accidental durante carga
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !loading) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      modal={true} // Forzar modalidad
    >
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => {
          if (loading) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (loading) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Ajuste Manual de Inventario</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del producto */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-semibold text-sm text-gray-900 mb-2">
              {producto.nombre}
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Stock Inicial:</span>
                <p className="font-medium">{stockInicial.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-600">Stock Actual:</span>
                <p className="font-medium">{stockActual.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Select de tipos */}
          <div>
            <Label htmlFor="tipo-movimiento" className="font-semibold">
              Tipo de movimiento
            </Label>
            <select
              id="tipo-movimiento"
              value={tipoSeleccionado}
              onChange={(e) => setTipoSeleccionado(e.target.value)}
              className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="">Selecciona tipo</option>
              {tipos.map((tipo) => (
                <option
                  key={tipo.idTipoMovimiento}
                  value={tipo.idTipoMovimiento}
                >
                  {tipo.tipo}
                </option>
              ))}
            </select>
          </div>

          {/* Input de cantidad */}
          <div>
            <Label htmlFor="cantidad" className="font-semibold">
              Nueva cantidad
            </Label>
            <Input
              id="cantidad"
              type="number"
              value={cantidad || ""}
              onChange={(e) => setCantidad(Number(e.target.value) || 0)}
              placeholder="Ingresa la nueva cantidad"
              disabled={loading}
              className="mt-1"
              min="0"
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !tipoSeleccionado || cantidad <= 0}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Guardando...
                </>
              ) : (
                "Guardar Ajuste"
              )}
            </Button>
          </div>
          <div>
            <Label htmlFor="observacion" className="font-semibold">
              Observación
            </Label>
            <textarea
              id="observacion"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Escribe una observación sobre este ajuste"
              disabled={loading}
              className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
