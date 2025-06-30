"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, ShoppingCart, Package } from "lucide-react";
import { toast } from "sonner";
import { getToken } from "@/lib/getToken";

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

export default function NuevaCompraPage() {
  const router = useRouter();
  const { getToken: getClerkToken } = useAuth();
  
  // Estados
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [formData, setFormData] = useState<CompraFormData>({
    idProveedor: "",
    ProductosCompras: []
  });

  // Cargar datos iniciales
  useEffect(() => {
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
        toast.error("Error al cargar datos iniciales");
      }
    };

    loadData();
  }, []);

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
      toast.error("Selecciona un proveedor");
      return;
    }

    if (formData.ProductosCompras.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }

    // Validar productos
    for (const producto of formData.ProductosCompras) {
      if (!producto.idProducto || producto.cantidad <= 0 || producto.precio <= 0) {
        toast.error("Completa todos los campos de productos correctamente");
        return;
      }
    }

    setLoading(true);

    try {
      const token = await getToken();
      if (!token) {
        toast.error("Error de autenticación");
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
        toast.success("Compra creada exitosamente");
        router.push("/compras");
      } else {
        toast.error(data.message || "Error al crear la compra");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al crear la compra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Nueva Compra</h1>
            <p className="text-muted-foreground">Registra una nueva compra de productos</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información de la compra */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Información de la Compra
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
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
            </CardContent>
          </Card>

          {/* Productos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Productos ({formData.ProductosCompras.length})
                </CardTitle>
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
            </CardHeader>
            <CardContent>
              {formData.ProductosCompras.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay productos agregados</p>
                  <p className="text-sm">Haz clic en "Agregar Producto" para comenzar</p>
                </div>
              ) : (
                <div className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Total */}
          {formData.ProductosCompras.length > 0 && (
            <Card>
              <CardContent className="pt-6">
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
              </CardContent>
            </Card>
          )}

          {/* Botones de acción */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
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
      </div>
    </div>
  );
}