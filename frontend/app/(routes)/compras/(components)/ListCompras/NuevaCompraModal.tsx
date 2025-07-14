"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ShoppingCart, Package, X, Loader2, Plus, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormCreateProduct } from "../../../catalog/(components)/FormCreateProduct"; // 👈 Importar el componente existente

// Tipos
interface Proveedor {
  idProveedor: string;
  razonsocial: string;
}

interface Producto {
  id: string;
  nombre: string;
  precio: number;
}

interface ProductoCompraFormData {
  idProducto: string;
  cantidad: number;
  precio: number;
  nombre: string;
}

interface CompraFormData {
  idProveedor: string;
  ProductosCompras: ProductoCompraFormData[];
}

interface NuevaCompraModalProps {
  open: boolean;
  onClose: () => void;
  onCompraCreada?: () => void;
}

// 🎯 Componente que wrappea FormCreateProduct en un modal
function CreateProductModal({
  onProductCreated,
}: {
  onProductCreated: (producto: Producto) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // 🔄 Callback que se ejecuta cuando se crea exitosamente un producto
  const handleProductSuccess = async () => {
    // Cerrar el modal
    setIsOpen(false);
    
    // Mostrar mensaje de éxito
    toast({
      title: "Producto creado",
      description: "El producto ha sido agregado al catálogo. Búscalo para agregarlo a la compra.",
    });

    // Notificar al componente padre para que recargue los productos
    // En lugar de pasar el producto directamente, simplemente notificamos que se creó
    // El componente padre puede recargar la lista completa
    onProductCreated({} as Producto); // Pasamos un objeto vacío como señal
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex items-center gap-1 hover:bg-green-50 hover:border-green-300"
        >
          <Plus className="w-3 h-3" />
          Crear Producto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-green-600" />
            Crear Nuevo Producto
          </DialogTitle>
          <DialogDescription>
            Agrega un nuevo producto al catálogo y podrás buscarlo para agregarlo a la compra
          </DialogDescription>
        </DialogHeader>
        
        {/* 🎯 Aquí usamos el FormCreateProduct existente */}
        <div className="mt-4">
          <FormCreateProduct onSuccess={handleProductSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function NuevaCompraModal({ open, onClose, onCompraCreada }: NuevaCompraModalProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [formData, setFormData] = useState<CompraFormData>({ 
    idProveedor: "", 
    ProductosCompras: [] 
  });
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Carga proveedores
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("Token no disponible");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/proveedores/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        const list: Proveedor[] = Array.isArray(data) ? data : data.proveedores || [];
        setProveedores(list);
      } catch (err) {
        console.error("Error cargando proveedores:", err);
        toast({ title: "No se pudo cargar proveedores", variant: "destructive" });
      }
    })();
  }, [open, getToken, toast]);

  // 🔄 Función para cargar productos (separada para poder reutilizarla)
  const fetchProductos = async () => {
    setLoadingProducts(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/productos/empresa`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const list: Producto[] = (data.productos || data || []).map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        precio: p.precioCompra || p.precio || 0,
      }));
      setProductos(list);
    } catch (err) {
      console.error("Error cargando productos:", err);
      toast({ title: "No se pudo cargar productos", variant: "destructive" });
    } finally {
      setLoadingProducts(false);
    }
  };

  // Carga productos cuando se abre el modal
  useEffect(() => {
    if (open) {
      fetchProductos();
    }
  }, [open]);

  // Reset cuando se cierra
  useEffect(() => {
    if (!open) {
      setFormData({ idProveedor: "", ProductosCompras: [] });
      setSearchTerm("");
      setShowDropdown(false);
    }
  }, [open]);

  // 🎯 Callback cuando se crea un nuevo producto
  const handleProductCreated = () => {
    // Recargar la lista de productos para incluir el nuevo
    fetchProductos();
    
    toast({
      title: "Lista actualizada",
      description: "Busca el nuevo producto para agregarlo a la compra",
    });
  };

  // Autocomplete filtrado
  const filtered = productos.filter(
    (p) =>
      !formData.ProductosCompras.some((cp) => cp.idProducto === p.id) &&
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Funciones para manejar productos
  const addProduct = (prod: Producto) => {
    setFormData((f) => ({
      ...f,
      ProductosCompras: [
        ...f.ProductosCompras,
        { 
          idProducto: prod.id, 
          cantidad: 1, 
          precio: prod.precio,
          nombre: prod.nombre 
        },
      ],
    }));
    setSearchTerm("");
    setShowDropdown(false);
  };

  const updateQty = (i: number, qty: number) => {
    setFormData((f) => ({
      ...f,
      ProductosCompras: f.ProductosCompras.map((it, idx) =>
        idx === i ? { ...it, cantidad: Math.max(1, qty) } : it
      ),
    }));
  };

  const updatePrice = (i: number, precio: number) => {
    setFormData((f) => ({
      ...f,
      ProductosCompras: f.ProductosCompras.map((it, idx) =>
        idx === i ? { ...it, precio: Math.max(0, precio) } : it
      ),
    }));
  };

  const removeProd = (i: number) => {
    setFormData((f) => ({
      ...f,
      ProductosCompras: f.ProductosCompras.filter((_, idx) => idx !== i),
    }));
  };

  // Cálculos totales
  const totalCompra = formData.ProductosCompras.reduce(
    (sum, it) => sum + (it.cantidad * it.precio),
    0
  );

  const totalItems = formData.ProductosCompras.reduce(
    (sum, it) => sum + it.cantidad,
    0
  );

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.idProveedor) {
      return toast({ title: "Selecciona proveedor", variant: "destructive" });
    }
    if (!formData.ProductosCompras.length) {
      return toast({ title: "Agrega al menos un producto", variant: "destructive" });
    }

    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Token no disponible");
      
      const payload = {
        idProveedor: formData.idProveedor,
        ProductosCompras: formData.ProductosCompras.map((it) => ({
          idProducto: it.idProducto,
          cantidad: it.cantidad,
          precio: it.precio,
        })),
      };

      console.log("📦 Enviando compra:", payload);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compras/create`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al crear la compra");
      }

      const result = await res.json();
      console.log("✅ Compra creada:", result);

      toast({ 
        title: "Compra creada exitosamente", 
        description: `Total: $${totalCompra.toLocaleString("es-CO")}` 
      });
      
      onClose();
      onCompraCreada?.();
    } catch (err: any) {
      console.error("❌ Error:", err);
      toast({ 
        title: "Error creando compra", 
        description: err.message,
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para formatear moneda
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString("es-CO")}`;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X size={24} />
        </button>

        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-600" /> 
          Nueva Compra
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Proveedor */}
          <div>
            <Label>Proveedor *</Label>
            <Select
              value={formData.idProveedor}
              onValueChange={(v) => setFormData((f) => ({ ...f, idProveedor: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona proveedor" />
              </SelectTrigger>
              <SelectContent>
                {proveedores.map((prov) => (
                  <SelectItem key={prov.idProveedor} value={prov.idProveedor}>
                    {prov.razonsocial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Productos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Package className="w-5 h-5 text-green-600" /> 
                Productos ({formData.ProductosCompras.length})
              </h3>
              {totalItems > 0 && (
                <div className="text-sm text-gray-600">
                  {totalItems} unidades totales
                </div>
              )}
            </div>

            {/* Lista de productos agregados */}
            {formData.ProductosCompras.length > 0 && (
              <div className="space-y-3 max-h-60 overflow-y-auto border rounded-lg p-3">
                {formData.ProductosCompras.map((it, idx) => (
                  <div key={idx} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{it.nombre}</div>
                        <div className="text-xs text-gray-500">
                          ID: {it.idProducto}
                        </div>
                        <div className="text-xs text-blue-600">
                          Precio actual: {formatCurrency(productos.find(p => p.id === it.idProducto)?.precio || 0)}
                        </div>
                        {it.precio !== (productos.find(p => p.id === it.idProducto)?.precio || 0) && (
                          <div className="text-xs text-orange-600 font-medium">
                            ⚠️ Se actualizará precio del producto
                          </div>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => removeProd(idx)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                    
                    {/* Controles de cantidad y precio */}
                    <div className="grid grid-cols-4 gap-3 items-center">
                      <div>
                        <Label className="text-xs">Cantidad</Label>
                        <Input
                          type="number"
                          min={1}
                          value={it.cantidad}
                          onChange={(e) => {
                            const qty = parseInt(e.target.value, 10);
                            updateQty(idx, isNaN(qty) ? 1 : qty);
                          }}
                          className="text-sm"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs">Nuevo Precio Compra</Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                            $
                          </span>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={it.precio}
                            onChange={(e) => {
                              const precio = parseFloat(e.target.value) || 0;
                              updatePrice(idx, precio);
                            }}
                            className="text-sm pl-6"
                            placeholder="Precio"
                          />
                        </div>
                        <div className="text-xs text-orange-600 mt-1">
                          Actualizará precio del producto
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <Label className="text-xs text-gray-600">Subtotal</Label>
                        <div className="font-semibold text-green-600">
                          {formatCurrency(it.cantidad * it.precio)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <Label className="text-xs text-gray-600">x{it.cantidad}</Label>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(it.precio)} c/u
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Buscador de productos con botón para crear nuevo */}
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Agregar Producto</Label>
                {/* 🎯 Botón para crear nuevo producto */}
                <CreateProductModal onProductCreated={handleProductCreated} />
              </div>
              
              <Input
                placeholder="Buscar producto por nombre..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(e.target.value.length > 0);
                }}
                onFocus={() => setShowDropdown(searchTerm.length > 0)}
                className="mt-1"
              />
              
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border rounded shadow-lg max-h-40 overflow-auto z-10 mt-1">
                  {(filtered.length > 0 ? filtered : [
                    { id: "", nombre: "No hay resultados", precio: 0 }
                  ]).slice(0, 10).map((p) => (
                    <button
                      key={p.id || "no-results"}
                      type="button"
                      disabled={!p.id}
                      onClick={() => p.id && addProduct(p)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 flex justify-between"
                    >
                      <span>{p.nombre}</span>
                      {p.id && <span className="text-green-600">{formatCurrency(p.precio)}</span>}
                    </button>
                  ))}
                </div>
              )}
              
              {loadingProducts && (
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <Loader2 className="animate-spin" size={16} />
                  Cargando productos...
                </div>
              )}
            </div>
          </div>

          {/* Resumen de totales */}
          {formData.ProductosCompras.length > 0 && (
            <div className="border-t pt-4 space-y-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Productos diferentes:</span>
                <span className="font-medium">{formData.ProductosCompras.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Unidades totales:</span>
                <span className="font-medium">{totalItems}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span className="flex items-center gap-1">
                  <DollarSign size={18} />
                  Total Compra:
                </span>
                <span className="text-green-600">{formatCurrency(totalCompra)}</span>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!formData.ProductosCompras.length || loading}
              className="min-w-[130px]"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="mr-2" size={16} />
                  Crear Compra
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}