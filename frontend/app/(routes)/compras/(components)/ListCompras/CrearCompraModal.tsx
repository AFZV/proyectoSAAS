// app/(routes)/compras/(components)/ListCompras/CrearCompraModal.tsx
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
import { Loader2, Plus, Trash2, Package } from "lucide-react";
import { useRouter } from "next/navigation";

interface Producto {
  idProducto: string;
  nombre: string;
  precioCompra: number;
}

interface ProductoCompra {
  idProducto: string;
  cantidad: number;
}

interface CrearCompraModalProps {
  open: boolean;
  onClose: () => void;
}

export function CrearCompraModal({ open, onClose }: CrearCompraModalProps) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosCompra, setProductosCompra] = useState<ProductoCompra[]>([
    { idProducto: "", cantidad: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const { getToken } = useAuth();
  const router = useRouter();

  // ID de proveedor quemado (temporal)
  const ID_PROVEEDOR_TEMPORAL = "b011b129-e19e-4c90-9970-1bc4b8afde09";

  // Resetear estado cuando se cierra el modal
  useEffect(() => {
    if (!open) {
      setProductosCompra([{ idProducto: "", cantidad: 0 }]);
    }
  }, [open]);

  // Cargar productos disponibles
  useEffect(() => {
    if (!open) return;
    
    const cargarProductos = async () => {
      setLoadingProductos(true);
      try {
        const token = await getToken();
        if (!token) throw new Error("No se obtuvo token");
        
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/productos/activos`,
          { 
            headers: { 
              "Content-Type": "application/json", 
              Authorization: `Bearer ${token}` 
            } 
          }
        );
        
        if (!res.ok) throw new Error("Error al cargar productos");
        
        const data = await res.json();
        setProductos(Array.isArray(data.productos) ? data.productos : []);
      } catch (err) {
        console.error("Error cargando productos:", err);
        setProductos([]);
      } finally {
        setLoadingProductos(false);
      }
    };

    cargarProductos();
  }, [open, getToken]);

  const agregarProducto = () => {
    setProductosCompra([...productosCompra, { idProducto: "", cantidad: 0 }]);
  };

  const eliminarProducto = (index: number) => {
    if (productosCompra.length > 1) {
      setProductosCompra(productosCompra.filter((_, i) => i !== index));
    }
  };

  const actualizarProducto = (index: number, campo: keyof ProductoCompra, valor: string | number) => {
    const nuevosProductos = [...productosCompra];
    nuevosProductos[index] = { ...nuevosProductos[index], [campo]: valor };
    setProductosCompra(nuevosProductos);
  };

  const getProductoNombre = (idProducto: string) => {
    const producto = productos.find(p => p.idProducto === idProducto);
    return producto?.nombre || "Selecciona un producto";
  };

  const validarFormulario = () => {
    return productosCompra.every(p => p.idProducto && p.cantidad > 0);
  };

  const handleSubmit = async () => {
    if (!validarFormulario()) {
      alert("Por favor completa todos los campos");
      return;
    }
    
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No se obtuvo token");

      const compraData = {
        idProveedor: ID_PROVEEDOR_TEMPORAL,
        ProductosCompras: productosCompra.map(p => ({
          idProducto: p.idProducto,
          cantidad: p.cantidad
        }))
      };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/compras/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(compraData),
        }
      );

      if (!res.ok) throw new Error("Error al crear la compra");

      // Cerrar modal y refrescar
      onClose();
      router.refresh();
      
      // Mensaje de éxito
      alert("¡Compra creada exitosamente!");
      
    } catch (error) {
      console.error("Error al crear compra:", error);
      alert('Error al crear la compra. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const calcularTotal = () => {
    return productosCompra.reduce((total, item) => {
      const producto = productos.find(p => p.idProducto === item.idProducto);
      return total + (producto?.precioCompra || 0) * item.cantidad;
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => !newOpen && !loading && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Nueva Compra
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Información del proveedor */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Proveedor</h4>
            <p className="text-blue-700">Argelia Internacional (Temporal)</p>
            <p className="text-xs text-blue-600">ID: {ID_PROVEEDOR_TEMPORAL}</p>
          </div>

          {/* Productos */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Productos</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={agregarProducto}
                disabled={loading || loadingProductos}
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>

            {loadingProductos ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin h-6 w-6" />
                <span className="ml-2">Cargando productos...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {productosCompra.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                    <div className="md:col-span-2">
                      <Label>Producto</Label>
                      <select
                        value={item.idProducto}
                        onChange={(e) => actualizarProducto(index, 'idProducto', e.target.value)}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                        disabled={loading}
                      >
                        <option value="">Selecciona un producto</option>
                        {productos.map((producto) => (
                          <option key={producto.idProducto} value={producto.idProducto}>
                            {producto.nombre} - ${producto.precioCompra.toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label>Cantidad</Label>
                        <Input
                          type="number"
                          value={item.cantidad || ""}
                          onChange={(e) => actualizarProducto(index, 'cantidad', Number(e.target.value) || 0)}
                          placeholder="0"
                          min="1"
                          disabled={loading}
                        />
                      </div>
                      
                      {productosCompra.length > 1 && (
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => eliminarProducto(index)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Subtotal */}
                    {item.idProducto && item.cantidad > 0 && (
                      <div className="md:col-span-3 text-right text-sm text-gray-600">
                        Subtotal: ${((productos.find(p => p.idProducto === item.idProducto)?.precioCompra || 0) * item.cantidad).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total */}
          {productosCompra.some(p => p.idProducto && p.cantidad > 0) && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total de la Compra:</span>
                <span className="text-xl font-bold text-green-600">
                  ${calcularTotal().toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !validarFormulario()}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Creando...
                </>
              ) : (
                "Crear Compra"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}