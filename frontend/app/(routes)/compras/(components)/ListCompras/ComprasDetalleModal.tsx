// components/compras/CompraDetalleModal.tsx
"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

interface CompraDetalleModalProps {
  open: boolean;
  onClose: () => void;
  idCompra?: string | null;
  compraData?: CompraDetalle | null;
}

interface Producto {
  nombre: string;
  cantidad: number;
  cantidadMovimiendo: number;
  id?: string; // Cambiar de idProducto a id
  idProducto?: string; // Mantener compatibilidad
}

interface CompraDetalle {
  idCompra: string;
  FechaCompra: string;
  productos: Producto[];
}

export function CompraDetalleModal({ open, onClose, idCompra, compraData }: CompraDetalleModalProps) {
  const [compra, setCompra] = useState<CompraDetalle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProducts, setEditingProducts] = useState<Array<{idProducto: string, cantidad: number, nombre?: string}>>([]);
  const [availableProducts, setAvailableProducts] = useState<Array<{idProducto: string, nombre: string}>>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { getToken } = useAuth();

  useEffect(() => {
    if (!open) {
      setCompra(null);
      setError(null);
      return;
    }

    // Si tenemos datos directos, usarlos (evita problemas de token)
    if (compraData) {
      console.log("Using direct data:", compraData);
      setCompra(compraData);
      // Inicializar productos para edición
      if (compraData.productos) {
        setEditingProducts(compraData.productos.map(p => ({
          idProducto: p.id || p.idProducto || '',
          cantidad: p.cantidad || 0,
          nombre: p.nombre
        })));
      }
      return;
    }

    // Solo hacer fetch si necesitamos datos y tenemos ID
    if (!idCompra) {
      setError("No se proporcionó ID de compra");
      return;
    }

    const fetchCompra = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log("Fetching compra with ID:", idCompra);
        
        // Intentar obtener el token de diferentes maneras
        let token;
        try {
          token = await getToken();
          console.log("Token con getToken():", token ? "✓" : "✗");
        } catch (tokenError) {
          console.log("Error con getToken():", tokenError);
          try {
            token = await getToken({ template: "default" });
            console.log("Token con template default:", token ? "✓" : "✗");
          } catch (templateError) {
            console.log("Error con template default:", templateError);
            throw new Error("No se pudo obtener el token de autenticación");
          }
        }

        if (!token) {
          throw new Error("Token de autenticación no disponible");
        }
        
        const url = `${process.env.NEXT_PUBLIC_API_URL?.trim()}/compras/find/${idCompra}`;
        console.log("Full URL:", url);
        
        const res = await fetch(url, {
          method: 'GET',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
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
        
        // Los datos vienen envueltos en un objeto 'compra'
        if (data && data.compra && data.compra.idCompra) {
          console.log("Setting compra data:", data.compra);
          setCompra(data.compra);
          // Inicializar productos para edición
          if (data.compra.productos) {
            setEditingProducts(data.compra.productos.map(p => ({
              idProducto: p.id || p.idProducto || '',
              cantidad: p.cantidad || 0,
              nombre: p.nombre
            })));
          }
        } else if (data && data.idCompra) {
          // Fallback si vienen directamente
          console.log("Setting direct data:", data);
          setCompra(data);
          if (data.productos) {
            setEditingProducts(data.productos.map(p => ({
              idProducto: p.id || p.idProducto || '',
              cantidad: p.cantidad || 0,
              nombre: p.nombre
            })));
          }
        } else {
          console.error("Data structure unexpected:", data);
          setError("Estructura de datos inesperada");
        }
      } catch (err) {
        console.error("Error fetching compra:", err);
        if (err instanceof Error && err.message.includes("token")) {
          setError("Error de autenticación. Por favor, inicia sesión nuevamente.");
        } else {
          setError(err instanceof Error ? err.message : "Error al cargar la compra");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCompra();
  }, [open, idCompra, compraData, getToken]);

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

  // Función para cargar productos disponibles
  const fetchAvailableProducts = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL?.trim()}/productos/empresa`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        console.log("Productos disponibles:", data);
        // Ajustar según la estructura de respuesta de tu API
        const products = data.productos || data || [];
        setAvailableProducts(products.map(p => ({
          idProducto: p.id || p.idProducto,
          nombre: p.nombre
        })));
      }
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  // Función para actualizar la compra
  const updateCompra = async () => {
    if (!compra?.idCompra) return;
    
    setUpdating(true);
    try {
      const token = await getToken();
      const body = {
        ProductosCompras: editingProducts
          .filter(p => p.cantidad > 0) // Solo productos con cantidad > 0
          .map(p => ({
            idProducto: p.idProducto,
            cantidad: p.cantidad
          }))
      };

      console.log("Updating compra with:", body);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL?.trim()}/compras/update/${compra.idCompra}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        // Recargar datos después de actualizar
        setIsEditing(false);
        if (compraData) {
          // Si usamos datos directos, necesitaríamos refrescar la página o notificar al padre
          window.location.reload(); // Temporal - mejor sería usar un callback
        } else {
          // Recargar desde la API
          window.location.reload();
        }
      } else {
        const errorText = await res.text();
        throw new Error(`Error ${res.status}: ${errorText}`);
      }
    } catch (error) {
      console.error("Error updating compra:", error);
      setError(error instanceof Error ? error.message : "Error al actualizar compra");
    } finally {
      setUpdating(false);
    }
  };

  // Funciones para manejar la edición de productos
  const updateProductQuantity = (index: number, newQuantity: number) => {
    const updated = [...editingProducts];
    updated[index].cantidad = Math.max(0, newQuantity);
    setEditingProducts(updated);
  };

  const removeProduct = (index: number) => {
    const updated = editingProducts.filter((_, i) => i !== index);
    setEditingProducts(updated);
  };

  const addNewProduct = (productId: string) => {
    const product = availableProducts.find(p => p.idProducto === productId);
    if (product && !editingProducts.find(p => p.idProducto === productId)) {
      setEditingProducts([...editingProducts, {
        idProducto: product.idProducto,
        cantidad: 1,
        nombre: product.nombre
      }]);
      // Limpiar búsqueda
      setSearchTerm("");
      setShowDropdown(false);
    }
  };

  // Función para filtrar productos por búsqueda
  const filteredProducts = availableProducts
    .filter(p => 
      !editingProducts.find(ep => ep.idProducto === p.idProducto) &&
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const startEditing = () => {
    setIsEditing(true);
    fetchAvailableProducts();
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setSearchTerm("");
    setShowDropdown(false);
    // Resetear a los productos originales
    if (compra?.productos) {
      setEditingProducts(compra.productos.map(p => ({
        idProducto: p.id || p.idProducto || '',
        cantidad: p.cantidad || 0,
        nombre: p.nombre
      })));
    }
  };

  const handleClose = () => {
    setCompra(null);
    setError(null);
    setIsEditing(false);
    setSearchTerm("");
    setShowDropdown(false);
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
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-lg">
                  Productos ({isEditing ? editingProducts.length : compra.productos?.length || 0})
                </h4>
                {!isEditing && (
                  <button
                    onClick={startEditing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Actualizar Compra
                  </button>
                )}
              </div>
              
              {!compra.productos || compra.productos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay productos en esta compra
                </div>
              ) : (
                <div className="space-y-3">
                  {isEditing ? (
                    // Modo edición
                    <>
                      {editingProducts.map((producto, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{producto.nombre}</h5>
                              <p className="text-sm text-gray-600">ID: {producto.idProducto}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600">Cantidad:</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={producto.cantidad}
                                  onChange={(e) => updateProductQuantity(index, parseInt(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                                />
                              </div>
                              <button
                                onClick={() => removeProduct(index)}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Eliminar producto"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Agregar nuevo producto con autocompletado */}
                      <div className="bg-blue-50 rounded-lg p-4 border-2 border-dashed border-blue-200">
                        <div className="relative autocomplete-container">
                          <input
                            type="text"
                            placeholder="Buscar producto para agregar..."
                            value={searchTerm}
                            onChange={(e) => {
                              setSearchTerm(e.target.value);
                              setShowDropdown(e.target.value.length > 0);
                            }}
                            onFocus={() => setShowDropdown(searchTerm.length > 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          
                          {showDropdown && filteredProducts.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-10 mt-1">
                              {filteredProducts.slice(0, 10).map(product => (
                                <button
                                  key={product.idProducto}
                                  onClick={() => addNewProduct(product.idProducto)}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="font-medium text-gray-900">{product.nombre}</div>
                                  <div className="text-xs text-gray-500">ID: {product.idProducto}</div>
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
                        
                        {availableProducts.length === 0 && (
                          <div className="text-sm text-gray-500 mt-2">
                            Cargando productos disponibles...
                          </div>
                        )}
                      </div>

                      {/* Botones de acción para modo edición */}
                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={updateCompra}
                          disabled={updating}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                        >
                          {updating ? "Guardando..." : "Guardar Cambios"}
                        </button>
                        <button
                          onClick={cancelEditing}
                          disabled={updating}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  ) : (
                    // Modo vista
                    compra.productos.map((prod: Producto, index: number) => (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">{prod.nombre}</h5>
                            <p className="text-sm text-gray-600">ID: {prod.id || prod.idProducto}</p>
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
                    ))
                  )}
                </div>
              )}
            </div>

            {compra.productos && compra.productos.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <div className="flex justify-between text-sm font-medium">
                  <span>Total Cantidad:</span>
                  <span>
                    {isEditing 
                      ? editingProducts.reduce((sum, p) => sum + p.cantidad, 0).toLocaleString()
                      : compra.productos.reduce((sum, p) => sum + (p.cantidad || 0), 0).toLocaleString()
                    }
                  </span>
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