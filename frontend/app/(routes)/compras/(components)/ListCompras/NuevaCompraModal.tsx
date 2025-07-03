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
import { ShoppingCart, Package, X, Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export function NuevaCompraModal({ open, onClose, onCompraCreada }: NuevaCompraModalProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [formData, setFormData] = useState<CompraFormData>({ idProveedor: "", ProductosCompras: [] });
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

  // Carga productos
  useEffect(() => {
    if (!open) return;
    (async () => {
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
    })();
  }, [open, getToken, toast]);

  // reset
  useEffect(() => {
    if (!open) {
      setFormData({ idProveedor: "", ProductosCompras: [] });
      setSearchTerm("");
      setShowDropdown(false);
    }
  }, [open]);

  // Autocomplete
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
        { idProducto: prod.id, cantidad: 0, precio: prod.precio, nombre: prod.nombre },
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
  const removeProd = (i: number) => {
    setFormData((f) => ({
      ...f,
      ProductosCompras: f.ProductosCompras.filter((_, idx) => idx !== i),
    }));
  };

  const total = formData.ProductosCompras.reduce(
    (sum, it) => sum + it.cantidad * it.precio,
    0
  );

  // submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.idProveedor) return toast({ title: "Selecciona proveedor", variant: "destructive" });
    if (!formData.ProductosCompras.length)
      return toast({ title: "Agrega al menos un producto", variant: "destructive" });

    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error();
      const payload = {
        idProveedor: formData.idProveedor,
        ProductosCompras: formData.ProductosCompras.map((it) => ({
          idProducto: it.idProducto,
          cantidad: it.cantidad,
        })),
      };
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/compras/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error();
      toast({ title: "Compra creada" });
      onClose();
      onCompraCreada?.();
    } catch (err) {
      console.error(err);
      toast({ title: "Error creando compra", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" /> Nueva Compra
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Proveedor */}
          <div>
            <Label>Proveedor</Label>
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
                <Package className="w-5 h-5" /> Productos ({formData.ProductosCompras.length})
              </h3>
            </div>
            {formData.ProductosCompras.length > 0 && (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {formData.ProductosCompras.map((it, idx) => (
                  <div key={idx} className="p-4 border rounded-lg flex justify-between items-center">
                    <div>
                      <div className="font-medium">{it.nombre}</div>
                      <div className="text-sm text-gray-600">ID: {it.idProducto}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={0}
                        value={it.cantidad}
                        onChange={(e) => updateQty(idx, +e.target.value)}
                        className="w-20"
                      />
                      <div className="font-medium">
                        ${(it.cantidad * it.precio).toLocaleString("es-CO")}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => removeProd(idx)}>
                        <X size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Autocomplete */}
            <div className="border-2 border-dashed rounded-lg p-4 relative">
              <Input
                placeholder="Buscar producto…"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(e.target.value.length > 0);
                }}
                onFocus={() => setShowDropdown(searchTerm.length > 0)}
              />
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 bg-white border rounded shadow max-h-40 overflow-auto z-10">
                  {(filtered.length
                    ? filtered
                    : [{ id: "", nombre: "No hay resultados", precio: 0 }]
                  ).slice(0, 10).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!p.id}
                      onClick={() => p.id && addProduct(p)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100"
                    >
                      {p.nombre} — ${p.precio.toLocaleString("es-CO")}
                    </button>
                  ))}
                </div>
              )}
              {loadingProducts && (
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <Loader2 className="animate-spin" size={16} />
                  Cargando…
                </div>
              )}
            </div>
          </div>

          {/* Totales */}
          {formData.ProductosCompras.length > 0 && (
            <div className="border-t pt-4 flex justify-between font-semibold">
              <span>Total:</span>
              <span>${total.toLocaleString("es-CO")}</span>
            </div>
          )}

          {/* Acciones */}
          <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" onClick={() => {}} disabled={!formData.ProductosCompras.length || loading}>
              {loading ? (
                <Loader2 className="animate-spin mr-2" size={16} />
              ) : (
                <Plus className="mr-2" size={16} />
              )}
              Crear Compra
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
