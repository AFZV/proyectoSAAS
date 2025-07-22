// components/compras/CompraDetalleModal.tsx
"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Loader2, X, DollarSign } from "lucide-react";

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
  precio?: number; // 👈 AGREGAR PRECIO
  precioCompra?: number; // 👈 PRECIO DE COMPRA ALTERNATIVO
  id?: string;
  idProducto?: string;
}
type ProductoCompra = {
  id?: string;
  nombre?: string;
  idProducto?: string;
  cantidad?: number;
  precio?: number;
  precioCompra?: number;
};

interface CompraDetalle {
  idCompra: string;
  FechaCompra: string;
  productos: Producto[];
}

export function CompraDetalleModal({
  open,
  onClose,
  idCompra,
  compraData,
}: CompraDetalleModalProps) {
  const [compra, setCompra] = useState<CompraDetalle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProducts, setEditingProducts] = useState<
    Array<{
      idProducto: string;
      cantidad: number;
      precio: number; // 👈 AGREGAR PRECIO
      nombre?: string;
    }>
  >([]);
  const [availableProducts, setAvailableProducts] = useState<
    Array<{
      idProducto: string;
      nombre: string;
      precioCompra: number; // 👈 PRECIO DE COMPRA
    }>
  >([]);
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

    // Si tenemos datos directos, usarlos
    if (compraData) {
      console.log("Using direct data:", compraData);
      setCompra(compraData);
      // Inicializar productos para edición
      if (compraData.productos) {
        setEditingProducts(
          compraData.productos.map((p) => ({
            idProducto: p.id || p.idProducto || "",
            cantidad: p.cantidad || 0,
            precio: p.precio || p.precioCompra || 0, // 👈 USAR PRECIO
            nombre: p.nombre,
          }))
        );
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

        // Intentar obtener el token
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
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
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
            setEditingProducts(
              data.compra.productos.map((p: ProductoCompra) => ({
                idProducto: p.id || p.idProducto || "",
                cantidad: p.cantidad || 0,
                precio: p.precio || p.precioCompra || 0, // 👈 USAR PRECIO
                nombre: p.nombre,
              }))
            );
          }
        } else if (data && data.idCompra) {
          // Fallback si vienen directamente
          console.log("Setting direct data:", data);
          setCompra(data);
          if (data.productos) {
            setEditingProducts(
              data.productos.map((p: ProductoCompra) => ({
                idProducto: p.id || p.idProducto || "",
                cantidad: p.cantidad || 0,
                precio: p.precio || p.precioCompra || 0, // 👈 USAR PRECIO
                nombre: p.nombre,
              }))
            );
          }
        } else {
          console.error("Data structure unexpected:", data);
          setError("Estructura de datos inesperada");
        }
      } catch (err) {
        console.error("Error fetching compra:", err);
        if (err instanceof Error && err.message.includes("token")) {
          setError(
            "Error de autenticación. Por favor, inicia sesión nuevamente."
          );
        } else {
          setError(
            err instanceof Error ? err.message : "Error al cargar la compra"
          );
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
      if (!target.closest(".autocomplete-container")) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showDropdown]);

  // Función para cargar productos disponibles
  const fetchAvailableProducts = async () => {
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL?.trim()}/productos/empresa`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        console.log("Productos disponibles:", data);
        // Ajustar según la estructura de respuesta de tu API
        const products = data.productos || data || [];
        setAvailableProducts(
          products.map((p: ProductoCompra) => ({
            idProducto: p.id || p.idProducto,
            nombre: p.nombre,
            precioCompra: p.precioCompra || 0, // 👈 INCLUIR PRECIO DE COMPRA
          }))
        );
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
          .filter((p) => p.cantidad > 0) // Solo productos con cantidad > 0
          .map((p) => ({
            idProducto: p.idProducto,
            cantidad: p.cantidad,
            precio: p.precio, // 👈 INCLUIR PRECIO
          })),
      };

      console.log("Updating compra with:", body);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL?.trim()}/compras/update/${
          compra.idCompra
        }`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (res.ok) {
        // Recargar datos después de actualizar
        setIsEditing(false);
        if (compraData) {
          window.location.reload(); // Temporal - mejor sería usar un callback
        } else {
          window.location.reload();
        }
      } else {
        const errorText = await res.text();
        throw new Error(`Error ${res.status}: ${errorText}`);
      }
    } catch (error) {
      console.error("Error updating compra:", error);
      setError(
        error instanceof Error ? error.message : "Error al actualizar compra"
      );
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

  // 👈 NUEVA FUNCIÓN PARA ACTUALIZAR PRECIO
  const updateProductPrice = (index: number, newPrice: number) => {
    const updated = [...editingProducts];
    updated[index].precio = Math.max(0, newPrice);
    setEditingProducts(updated);
  };

  const removeProduct = (index: number) => {
    const updated = editingProducts.filter((_, i) => i !== index);
    setEditingProducts(updated);
  };

  const addNewProduct = (productId: string) => {
    const product = availableProducts.find((p) => p.idProducto === productId);
    if (product && !editingProducts.find((p) => p.idProducto === productId)) {
      setEditingProducts([
        ...editingProducts,
        {
          idProducto: product.idProducto,
          cantidad: 1,
          precio: product.precioCompra, // 👈 USAR PRECIO DE COMPRA
          nombre: product.nombre,
        },
      ]);
      // Limpiar búsqueda
      setSearchTerm("");
      setShowDropdown(false);
    }
  };

  // Función para filtrar productos por búsqueda
  const filteredProducts = availableProducts.filter(
    (p) =>
      !editingProducts.find((ep) => ep.idProducto === p.idProducto) &&
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
      setEditingProducts(
        compra.productos.map((p) => ({
          idProducto: p.id || p.idProducto || "",
          cantidad: p.cantidad || 0,
          precio: p.precio || p.precioCompra || 0, // 👈 USAR PRECIO
          nombre: p.nombre,
        }))
      );
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

  // 🔥 FUNCIONES PARA CÁLCULOS DE TOTALES - NÚMEROS COMPLETOS CON $
  const formatCurrency = (amount: number) => {
    try {
      // Formateo colombiano estándar con puntos como separadores Y símbolo $
      return `${amount.toLocaleString("es-CO", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
    } catch (error) {
      // Fallback manual si hay problemas con toLocaleString
      return `${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
    }
  };

  const calculateSubtotal = (cantidad: number, precio: number) => {
    return cantidad * precio;
  };

  const calculateTotal = (
    productos: Array<{ cantidad: number; precio: number }>
  ) => {
    return productos.reduce(
      (sum, p) => sum + calculateSubtotal(p.cantidad, p.precio),
      0
    );
  };

  const getTotalItems = (productos: Array<{ cantidad: number }>) => {
    return productos.reduce((sum, p) => sum + p.cantidad, 0);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
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
                <p className="font-semibold text-sm text-gray-600">
                  ID de Compra
                </p>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                  {compra.idCompra}
                </p>
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-600">Fecha</p>
                <p className="text-sm">
                  {new Date(compra.FechaCompra).toLocaleString("es-CO", {
                    year: "numeric",
                    month: "long",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-lg">
                  Productos (
                  {isEditing
                    ? editingProducts.length
                    : compra.productos?.length || 0}
                  )
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
                        <div
                          key={index}
                          className="bg-gray-50 rounded-lg p-4 border"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">
                                {producto.nombre}
                              </h5>
                              <p className="text-sm text-gray-600">
                                ID: {producto.idProducto}
                              </p>
                            </div>
                            <button
                              onClick={() => removeProduct(index)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Eliminar producto"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* 🔥 CONTROLES DE CANTIDAD Y PRECIO */}
                          <div className="grid grid-cols-4 gap-3 items-center">
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">
                                Cantidad
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={producto.cantidad}
                                onChange={(e) =>
                                  updateProductQuantity(
                                    index,
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-center text-sm"
                              />
                            </div>

                            <div>
                              <label className="text-xs text-gray-600 block mb-1">
                                Precio Unit.
                              </label>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                                  $
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={producto.precio}
                                  onChange={(e) =>
                                    updateProductPrice(
                                      index,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-full pl-6 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>
                            </div>

                            <div className="text-center">
                              <label className="text-xs text-gray-600 block mb-1">
                                Subtotal
                              </label>
                              <div className="font-semibold text-green-600 text-sm">
                                {formatCurrency(
                                  calculateSubtotal(
                                    producto.cantidad,
                                    producto.precio
                                  )
                                )}
                              </div>
                            </div>

                            <div className="text-center">
                              <label className="text-xs text-gray-600 block mb-1">
                                Detalle
                              </label>
                              <div className="text-xs text-gray-500">
                                {producto.cantidad} ×{" "}
                                {formatCurrency(producto.precio)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Agregar nuevo producto */}
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
                            onFocus={() =>
                              setShowDropdown(searchTerm.length > 0)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />

                          {showDropdown && filteredProducts.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-10 mt-1">
                              {filteredProducts.slice(0, 10).map((product) => (
                                <button
                                  key={product.idProducto}
                                  onClick={() =>
                                    addNewProduct(product.idProducto)
                                  }
                                  className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0 flex justify-between"
                                >
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {product.nombre}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      ID: {product.idProducto}
                                    </div>
                                  </div>
                                  <div className="text-sm text-green-600">
                                    {formatCurrency(product.precioCompra)}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {showDropdown &&
                            searchTerm &&
                            filteredProducts.length === 0 && (
                              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 mt-1">
                                <div className="text-gray-500 text-sm">
                                  No se encontraron productos
                                </div>
                              </div>
                            )}
                        </div>
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
                    // 🔥 MODO VISTA CON PRECIOS Y SUBTOTALES
                    compra.productos.map((prod: Producto, index: number) => (
                      <div
                        key={index}
                        className="border rounded-lg p-4 bg-gray-50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">
                              {prod.nombre}
                            </h5>
                            <p className="text-sm text-gray-600">
                              ID: {prod.id || prod.idProducto}
                            </p>
                          </div>
                        </div>

                        {/* 🔥 INFORMACIÓN DE PRECIOS */}
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Cantidad:</span>
                            <div className="font-medium">
                              {prod.cantidad?.toLocaleString() || 0}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Precio Unit.:</span>
                            <div className="font-medium text-blue-600">
                              {formatCurrency(
                                prod.precio || prod.precioCompra || 0
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Subtotal:</span>
                            <div className="font-bold text-green-600">
                              {formatCurrency(
                                calculateSubtotal(
                                  prod.cantidad || 0,
                                  prod.precio || prod.precioCompra || 0
                                )
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {prod.cantidad} ×{" "}
                            {formatCurrency(
                              prod.precio || prod.precioCompra || 0
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 🔥 RESUMEN DE TOTALES */}
            {compra.productos && compra.productos.length > 0 && (
              <div className="mt-6 pt-4 border-t bg-blue-50 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Productos diferentes:</span>
                    <span className="font-medium">
                      {isEditing
                        ? editingProducts.length
                        : compra.productos.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Unidades totales:</span>
                    <span className="font-medium">
                      {isEditing
                        ? getTotalItems(editingProducts).toLocaleString()
                        : getTotalItems(
                            compra.productos.map((p) => ({
                              cantidad: p.cantidad || 0,
                            }))
                          ).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-5 h-5" />
                      Total Compra:
                    </span>
                    <span className="text-green-600">
                      {isEditing
                        ? formatCurrency(calculateTotal(editingProducts))
                        : formatCurrency(
                            calculateTotal(
                              compra.productos.map((p) => ({
                                cantidad: p.cantidad || 0,
                                precio: p.precio || p.precioCompra || 0,
                              }))
                            )
                          )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
