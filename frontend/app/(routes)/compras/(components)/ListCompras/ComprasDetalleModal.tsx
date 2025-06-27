// components/compras/CompraDetalleModal.tsx
"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface CompraDetalleModalProps {
  open: boolean;
  onClose: () => void;
  idCompra: string | null;
}

interface Producto {
  nombre: string;
  cantidad: number;
  cantidadMovimiendo: number; // Corregido para coincidir con la API
}

interface CompraDetalle {
  idCompra: string;
  FechaCompra: string;
  productos: Producto[];
}

export function CompraDetalleModal({ open, onClose, idCompra }: CompraDetalleModalProps) {
  const [compra, setCompra] = useState<CompraDetalle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    if (!open || !idCompra) {
      setCompra(null);
      setError(null);
      return;
    }

    const fetchCompra = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log("Fetching compra with ID:", idCompra);
        
      const token = await getToken();
      if (!token) {
        console.error("No hay token de autenticación");
        return [];
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compras/find/${idCompra}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store", // Evita cache para datos actualizados
      });

        console.log("Response status:", res.status);
        console.log("Response ok:", res.ok);

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Error response:", errorText);
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        console.log("Data received:", data);

     if (data && data.compra && data.compra.idCompra) {
          console.log("Setting compra data:", data.compra);
          setCompra(data.compra);
        } else if (data && data.idCompra) {
          // Fallback si vienen directamente
          console.log("Setting direct data:", data);
          setCompra(data);
        } else {
          console.error("Data structure unexpected:", data);
          setError("Estructura de datos inesperada");
        }
      } catch (err) {
        console.error("Error fetching compra:", err);
        setError(err instanceof Error ? err.message : "Error al cargar la compra");
      } finally {
        setLoading(false);
      }
    };

    fetchCompra();
  }, [open, idCompra, getToken]);

  const handleClose = () => {
    setCompra(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de Compra</DialogTitle>
        </DialogHeader>
        
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Cargando...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {compra && !loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold text-sm text-gray-600">ID de Compra</p>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                  {compra.idCompra}
                </p>
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-600">Fecha</p>
                <p className="text-sm">
                  {new Date(compra.FechaCompra).toLocaleString("es-CO", {
                    year: 'numeric',
                    month: 'long',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-semibold text-lg mb-3">Productos ({compra.productos?.length || 0})</h4>
              
              {!compra.productos || compra.productos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay productos en esta compra
                </div>
              ) : (
                <div className="space-y-3">
                  {compra.productos.map((prod: Producto, index: number) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{prod.nombre}</h5>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Cantidad:</span> {prod.cantidad?.toLocaleString() || 0}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Movimiento:</span> {prod.cantidadMovimiendo?.toLocaleString() || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {compra.productos && compra.productos.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <div className="flex justify-between text-sm font-medium">
                  <span>Total Cantidad:</span>
                  <span>{compra.productos.reduce((sum, p) => sum + (p.cantidad || 0), 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Total Movimiento:</span>
                  <span>{compra.productos.reduce((sum, p) => sum + (p.cantidadMovimiendo || 0), 0).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}