"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, X, ShoppingCart, Package, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ID del proveedor fijo (hasta que tengas la API)
const PROVEEDOR_ID = "b011b129-e19e-4c90-9970-1bc4b8afde09";

// Tipos
type Producto = {
  id?: string;
  idProducto: string;
  nombre: string;
  precio: number;
};

type ProductoCompraFormData = {
  idProducto: string;
  cantidad: number;
  precio?: number;
  nombre?: string;
};

type CompraFormData = {
  idProveedor: string;
  ProductosCompras: ProductoCompraFormData[];
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
  const [formData, setFormData] = useState<CompraFormData>({
    idProveedor: PROVEEDOR_ID,
    ProductosCompras: []
  });
  
  // Estados para autocompletado
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Cargar productos cuando se abre la modal
  useEffect(() => {
    if (!open) return;

    const loadProducts = async () => {
      setLoadingProducts(true);
      try {
        const token = await getToken();
        if (!token) return;

        // Usar el mismo endpoint que funciona en CompraDetalle
        const productosRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL?.trim()}/productos/empresa`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (productosRes.ok) {
          const productosData = await productosRes.json();
          console.log("Productos disponibles:", productosData);
          // Ajustar según la estructura de respuesta de tu API
          const productosList = productosData.productos || productosData || [];
          setProductos(productosList.map(p => ({
            id: p.id,
            idProducto: p.idProducto || p.id,
            nombre: p.nombre,
            precio: p.precio || 0
          })));
        } else {
          console.error("Error al obtener productos:", productosRes.status, productosRes.statusText);
        }
      } catch (error) {
        console.error("Error cargando productos:", error);
        toast({
          title: "Error al cargar productos",
          variant: "destructive"
        });
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, [open, getToken, toast]);

  // Resetear formulario cuando se cierra la modal
  useEffect(() => {
    if (!open) {
      setFormData({
        idProveedor: PROVEEDOR_ID,
        ProductosCompras: []
      });
      setSearchTerm("");
      setShowDropdown(false);
    }
  }, [open]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.autocomplete-container')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);

  // Actualizar cantidad de producto
  const updateProductQuantity = (index: number, newQuantity: number) => {
    setFormData(prev => ({
      ...prev,
      ProductosCompras: prev.ProductosCompras.map((producto, i) => 
        i === index ? { ...producto, cantidad: Math.max(0, newQuantity) } : producto
      )
    }));
  };

  // Remover producto
  const removeProduct = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ProductosCompras: prev.ProductosCompras.filter((_, i) => i !== index)
    }));
  };

  // Agregar nuevo producto
  const addNewProduct = (productId: string) => {
    const product = productos.find(p => (p.id || p.idProducto) === productId);
    if (product && !formData.ProductosCompras.find(p => p.idProducto === productId)) {
      setFormData(prev => ({
        ...prev,
        ProductosCompras: [...prev.ProductosCompras, {
          idProducto: productId,
          cantidad: 1,
          precio: product.precio,
          nombre: product.nombre
        }]
      }));
      setSearchTerm("");
      setShowDropdown(false);
    }
  };

  // Filtrar productos por búsqueda
  const filteredProducts = productos.filter(p => 
    !formData.ProductosCompras.find(ep => ep.idProducto === (p.id || p.idProducto)) &&
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcular total
  const calcularTotal = () => {
    return formData.ProductosCompras.reduce((total, producto) => {
      return total + (producto.cantidad * (producto.precio || 0));
    }, 0);
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.ProductosCompras.length === 0) {
      toast({
        title: "Agrega al menos un producto",
        variant: "destructive"
      });
      return;
    }

    // Validar productos
    for (const producto of formData.ProductosCompras) {
      if (!producto.idProducto || producto.cantidad <= 0) {
        toast({
          title: "Todos los productos deben tener cantidad mayor a 0",
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

      // Preparar datos para envío
      const dataToSend = {
        idProveedor: formData.idProveedor,
        ProductosCompras: formData.ProductosCompras.map(p => ({
          idProducto: p.idProducto,
          cantidad: p.cantidad
        }))
      };

      console.log("Sending data:", dataToSend);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compras/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSend)
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Nueva Compra
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del proveedor */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <p className="font-semibold text-sm text-gray-600">Proveedor</p>
              <p className="text-sm bg-gray-100 p-2 rounded font-mono">
                {PROVEEDOR_ID}
              </p>
            </div>
          </div>

          {/* Productos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Package className="w-5 h-5" />
                Productos ({formData.ProductosCompras.length})
              </h3>
            </div>

            {/* Lista de productos agregados */}
            {formData.ProductosCompras.length > 0 && (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {formData.ProductosCompras.map((producto, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{producto.nombre}</h5>
                        <p className="text-sm text-gray-600">ID: {producto.idProducto}</p>
                        {producto.precio && (
                          <p className="text-sm text-gray-600">
                            Precio: ${producto.precio.toLocaleString('es-CO')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-gray-600">Cantidad:</Label>
                          <Input
                            type="number"
                            min="1"
                            value={producto.cantidad}
                            onChange={(e) => updateProductQuantity(index, parseInt(e.target.value) || 1)}
                            className="w-20 text-center"
                          />
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            ${((producto.cantidad || 0) * (producto.precio || 0)).toLocaleString('es-CO')}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeProduct(index)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Agregar nuevo producto con autocompletado */}
            <div className="bg-blue-50 rounded-lg p-4 border-2 border-dashed border-blue-200">
              <div className="relative autocomplete-container">
                <Input
                  type="text"
                  placeholder="Buscar producto para agregar..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowDropdown(e.target.value.length > 0);
                  }}
                  onFocus={() => setShowDropdown(searchTerm.length > 0)}
                  className="w-full"
                />
                
                {showDropdown && filteredProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-10 mt-1">
                    {filteredProducts.slice(0, 10).map(product => (
                      <button
                        key={product.id || product.idProducto}
                        type="button"
                        onClick={() => addNewProduct(product.id || product.idProducto)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{product.nombre}</div>
                        <div className="text-xs text-gray-500">
                          ID: {product.id || product.idProducto} | Precio: ${product.precio?.toLocaleString('es-CO') || 0}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {showDropdown && searchTerm && filteredProducts.length === 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 mt-1">
                    <div className="text-gray-500 text-sm">No se encontraron productos</div>
                  </div>
                )}
              </div>
              
              {loadingProducts && (
                <div className="flex items-center text-sm text-gray-500 mt-2">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Cargando productos disponibles...
                </div>
              )}
            </div>

            {/* Mensaje cuando no hay productos */}
            {formData.ProductosCompras.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay productos agregados</p>
                <p className="text-sm">Busca y selecciona productos para agregar a la compra</p>
              </div>
            )}
          </div>

          {/* Total */}
          {formData.ProductosCompras.length > 0 && (
            <div className="border-t pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Total Productos:</span>
                  <span>{formData.ProductosCompras.reduce((sum, p) => sum + p.cantidad, 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total de la Compra:</span>
                  <span className="text-xl">
                    {calcularTotal().toLocaleString("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                    })}
                  </span>
                </div>
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
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Compra
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}