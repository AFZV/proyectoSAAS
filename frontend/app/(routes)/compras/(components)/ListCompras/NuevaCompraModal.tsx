"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, ShoppingCart, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Tipos
type Producto = {
  idProducto: string;
  nombre: string;
  precio: number;
};

type ProductoCompraFormData = {
  idProducto: string;
  cantidad: number;
  precio: number;
};

type CompraFormData = {
  idProveedor: string;
  ProductosCompras: ProductoCompraFormData[];
};

type Proveedor = {
  idProveedor: string;
  nombre: string;
};

interface NuevaCompraModalProps {
  open: boolean;
  onClose: () => void;
  onCompraCreada?: () => void;
}

export function NuevaCompraModal({ open, onClose, onCompraCreada }: NuevaCompraModalProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  
  // Estados
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [formData, setFormData] = useState<CompraFormData>({
    idProveedor: "",
    ProductosCompras: []
  });

  // Cargar datos iniciales cuando se abre la modal
  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        // Cargar productos
        const productosRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/productos/findAll/empresa`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (productosRes.ok) {
          const productosData = await productosRes.json();
          setProductos(productosData.productos || productosData || []);
        }

        // Cargar proveedores
        const proveedoresRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/proveedores/findAll/empresa`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (proveedoresRes.ok) {
          const proveedoresData = await proveedoresRes.json();
          setProveedores(proveedoresData.proveedores || proveedoresData || []);
        }
      } catch (error) {
        console.error("Error cargando datos:", error);
        toast({
          title: "Error al cargar datos iniciales",
          variant: "destructive"
        });
      }
    };

    loadData();
  }, [open, getToken, toast]);

  // Resetear formulario cuando se cierra la modal
  useEffect(() => {
    if (!open) {
      setFormData({
        idProveedor: "",
        ProductosCompras: []
      });
    }
  }, [open]);

  // Agregar producto a la compra
  const agregarProducto = () => {
    setFormData(prev => ({
      ...prev,
      ProductosCompras: [
        ...prev.ProductosCompras,
        { idProducto: "", cantidad: 1, precio: 0 }
      ]
    }));
  };

  // Remover producto de la compra
  const removerProducto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ProductosCompras: prev.ProductosCompras.filter((_, i) => i !== index)
    }));
  };

  // Actualizar producto en la compra
  const actualizarProducto = (index: number, campo: keyof ProductoCompraFormData, valor: string | number) => {
    setFormData(prev => ({
      ...prev,
      ProductosCompras: prev.ProductosCompras.map((producto, i) => 
        i === index ? { ...producto, [campo]: valor } : producto
      )
    }));
  };

  // Calcular total
  const calcularTotal = () => {
    return formData.ProductosCompras.reduce((total, producto) => {
      return total + (producto.cantidad * producto.precio);
    }, 0);
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.idProveedor) {
      toast({
        title: "Selecciona un proveedor",
        variant: "destructive"
      });
      return;
    }

    if (formData.ProductosCompras.length === 0) {
      toast({
        title: "Agrega al menos un producto",
        variant: "destructive"
      });
      return;
    }

    // Validar productos
    for (const producto of formData.ProductosCompras) {
      if (!producto.idProducto || producto.cantidad <= 0 || producto.precio <= 0) {
        toast({
          title: "Completa todos los campos de productos correctamente",
          variant: "destructive"
        });
        return;
      }
    }

    setLoading(true);

    try {
      const token = await getToken();
      if (!token) {
        toast({
          title: "Error de autenticación",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compras/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Compra creada exitosamente"
        });
        onClose();
        onCompraCreada?.();
      } else {
        toast({
          title: data.message || "Error al crear la compra",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error al crear la compra",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Nueva Compra
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información de la compra */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información de la Compra</h3>
            <div>
              <Label htmlFor="proveedor">Proveedor *</Label>
              <Select
                value={formData.idProveedor}
                onValueChange={(value) => setFormData(prev => ({ ...prev, idProveedor: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {proveedores.map((proveedor) => (
                    <SelectItem key={proveedor.idProveedor} value={proveedor.idProveedor}>
                      {proveedor.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Productos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Package className="w-5 h-5" />
                Productos ({formData.ProductosCompras.length})
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={agregarProducto}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Producto
              </Button>
            </div>

            {formData.ProductosCompras.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay productos agregados</p>
                <p className="text-sm">Haz clic en "Agregar Producto" para comenzar</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-60 overflow-y-auto">
                {formData.ProductosCompras.map((producto, index) => (
                  <div key={index} className="flex gap-4 items-end p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label>Producto *</Label>
                      <Select
                        value={producto.idProducto}
                        onValueChange={(value) => {
                          actualizarProducto(index, "idProducto", value);
                          // Auto-llenar precio si está disponible
                          const productoSeleccionado = productos.find(p => p.idProducto === value);
                          if (productoSeleccionado) {
                            actualizarProducto(index, "precio", productoSeleccionado.precio);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {productos.map((prod) => (
                            <SelectItem key={prod.idProducto} value={prod.idProducto}>
                              {prod.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Label>Cantidad *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={producto.cantidad}
                        onChange={(e) => actualizarProducto(index, "cantidad", parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="w-32">
                      <Label>Precio Unitario *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={producto.precio}
                        onChange={(e) => actualizarProducto(index, "precio", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="w-32">
                      <Label>Subtotal</Label>
                      <div className="h-10 px-3 py-2 border rounded-md bg-muted text-sm">
                        ${(producto.cantidad * producto.precio).toLocaleString('es-CO')}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removerProducto(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total */}
          {formData.ProductosCompras.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total de la Compra:</span>
                <span className="text-2xl">
                  {calcularTotal().toLocaleString("es-CO", {
                    style: "currency",
                    currency: "COP",
                    minimumFractionDigits: 0,
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-4 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || formData.ProductosCompras.length === 0}
            >
              {loading ? "Guardando..." : "Crear Compra"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}