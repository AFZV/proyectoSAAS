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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShoppingCart,
  Package,
  X,
  Loader2,
  Plus,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormCreateProduct } from "../../../catalog/(components)/FormCreateProduct";

// ------------------ Tipos ------------------
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

// ------------------ Modal de Crear Producto ------------------
function CreateProductDialog({
  open,
  onClose,
  onProductCreated,
}: {
  open: boolean;
  onClose: () => void;
  onProductCreated: () => void;
}) {
  const { toast } = useToast();

  const handleSuccess = () => {
    toast({
      title: "Producto creado",
      description: "El producto fue agregado correctamente.",
    });
    onProductCreated();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-green-600" />
            Crear Nuevo Producto
          </DialogTitle>
        </DialogHeader>
        <FormCreateProduct onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}

// ------------------ Modal de Crear Compra ------------------
export function NuevaCompraModal({
  open,
  onClose,
  onCompraCreada,
}: NuevaCompraModalProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [formData, setFormData] = useState<CompraFormData>({
    idProveedor: "",
    ProductosCompras: [],
  });
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Estado para modal de producto
  const [openProductDialog, setOpenProductDialog] = useState(false);

  // Cargar proveedores
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("Token no disponible");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/proveedores/all`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        const list: Proveedor[] = Array.isArray(data)
          ? data
          : data.proveedores || [];
        setProveedores(list);
      } catch (err) {
        toast({
          title: "No se pudo cargar proveedores",
          variant: "destructive",
        });
      }
    })();
  }, [open, getToken, toast]);

  // Cargar productos
  const fetchProductos = async () => {
    setLoadingProducts(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/productos/empresa`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const list: Producto[] = (data.productos || data || []).map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        precio: p.precioCompra || p.precio || 0,
      }));
      setProductos(list);
    } catch (err) {
      toast({ title: "No se pudo cargar productos", variant: "destructive" });
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (open) fetchProductos();
  }, [open]);

  // Reset al cerrar modal
  useEffect(() => {
    if (!open) {
      setFormData({ idProveedor: "", ProductosCompras: [] });
      setSearchTerm("");
      setShowDropdown(false);
    }
  }, [open]);

  const handleProductCreated = () => {
    fetchProductos();
    toast({
      title: "Lista actualizada",
      description: "Producto agregado. Ahora puedes seleccionarlo.",
      duration: 500,
    });
  };

  const filtered = productos.filter(
    (p) =>
      !formData.ProductosCompras.some((cp) => cp.idProducto === p.id) &&
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addProduct = (prod: Producto) => {
    setFormData((f) => ({
      ...f,
      ProductosCompras: [
        ...f.ProductosCompras,
        {
          idProducto: prod.id,
          cantidad: 0,
          precio: prod.precio,
          nombre: prod.nombre,
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
        idx === i ? { ...it, cantidad: Math.max(0, qty) } : it
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

  const totalCompra = formData.ProductosCompras.reduce(
    (sum, it) => sum + it.cantidad * it.precio,
    0
  );
  const totalItems = formData.ProductosCompras.reduce(
    (sum, it) => sum + it.cantidad,
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.idProveedor) {
      return toast({ title: "Selecciona proveedor", variant: "destructive" });
    }
    if (formData.ProductosCompras.some((p) => p.cantidad === 0)) {
      return toast({
        title: "Cantidad requerida",
        description: "Todos los productos deben tener una cantidad mayor a 0",
        variant: "destructive",
      });
    }
    if (!formData.ProductosCompras.length) {
      return toast({
        title: "Agrega al menos un producto",
        variant: "destructive",
      });
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

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/compras/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al crear la compra");
      }

      toast({
        title: "Compra creada exitosamente",
        description: `Total: $${totalCompra.toLocaleString("es-CO")}`,
      });
      onClose();
      onCompraCreada?.();
    } catch (err: any) {
      toast({
        title: "Error creando compra",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Modal de compra fullscreen */}
      <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col h-screen">
        {/* Header fijo */}
        <div className="flex items-center justify-between p-4 border-b bg-blue-600 text-white">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" /> Nueva Compra
          </h2>
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-white hover:bg-blue-500"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 max-w-6xl w-full mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Proveedor */}
            <div>
              <Label>Proveedor *</Label>
              <Select
                value={formData.idProveedor}
                onValueChange={(v) =>
                  setFormData((f) => ({ ...f, idProveedor: v }))
                }
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
                  <Package className="w-5 h-5 text-green-600" /> Productos (
                  {formData.ProductosCompras.length})
                </h3>
                {totalItems > 0 && <div>{totalItems} unidades totales</div>}
              </div>

              {/* Lista productos */}
              {formData.ProductosCompras.length > 0 && (
                <div className="space-y-3 max-h-72 overflow-y-auto border rounded-lg p-3">
                  {formData.ProductosCompras.map((it, idx) => (
                    <div key={idx} className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-medium text-sm">{it.nombre}</div>
                          <div className="text-xs text-gray-500">
                            ID: {it.idProducto}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeProd(idx)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Cantidad</Label>
                          <Input
                            type="number"
                            value={it.cantidad || ""}
                            onChange={(e) =>
                              updateQty(idx, parseInt(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Precio</Label>
                          <Input
                            type="number"
                            value={it.precio}
                            onChange={(e) =>
                              updatePrice(idx, parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div className="text-center">
                          <Label className="text-xs">Subtotal</Label>
                          <div className="font-semibold text-green-600">
                            ${(it.cantidad * it.precio).toLocaleString("es-CO")}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Buscar producto */}
              <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 relative">
                <div className="flex justify-between mb-2">
                  <Label>Agregar Producto</Label>
                  <Button
                    type="button"
                    onClick={() => setOpenProductDialog(true)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 hover:bg-green-50 hover:border-green-300"
                  >
                    <Plus className="w-3 h-3" />
                    Crear Producto
                  </Button>
                </div>
                <Input
                  placeholder="Buscar producto por nombre..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowDropdown(e.target.value.length > 0);
                  }}
                />
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 bg-white border rounded shadow-lg max-h-40 overflow-auto z-10 mt-1">
                    {(filtered.length > 0
                      ? filtered
                      : [{ id: "", nombre: "No hay resultados", precio: 0 }]
                    )
                      .slice(0, 10)
                      .map((p) => (
                        <button
                          key={p.id || "no-results"}
                          type="button"
                          disabled={!p.id}
                          onClick={() => p.id && addProduct(p)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 flex justify-between"
                        >
                          <span>{p.nombre}</span>
                          {p.id && (
                            <span className="text-green-600">
                              ${p.precio.toLocaleString("es-CO")}
                            </span>
                          )}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Totales */}
            {formData.ProductosCompras.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="text-green-600 font-bold">
                    ${totalCompra.toLocaleString("es-CO")}
                  </span>
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-4 border-t pt-4">
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
                disabled={!formData.ProductosCompras.length || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" /> Creando...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2" /> Crear Compra
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal independiente para crear producto */}
      <CreateProductDialog
        open={openProductDialog}
        onClose={() => setOpenProductDialog(false)}
        onProductCreated={handleProductCreated}
      />
    </>
  );
}
