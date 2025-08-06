"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Save,
  X,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { formatValue } from "@/utils/FormartValue";
import { invoicesService } from "../../services/invoices.service";
import type { Pedido, DetallePedido } from "../../types/invoices.types";

interface EditPedidoModalProps {
  pedido: Pedido | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ProductoCarrito extends DetallePedido {
  nombre?: string;
  imagenUrl?: string;
  categoria?: string;
}

interface ProductoCatalogo {
  id: string;
  nombre: string;
  precio: number;
  categoria: string;
  imagenUrl?: string;
}

// ✅ Modal hijo corregido
interface ModalBuscarProductoProps {
  open: boolean;
  onClose: () => void;
  onSelect: (producto: ProductoCatalogo) => void;
  productos: ProductoCatalogo[];
}

function ModalBuscarProducto({
  open,
  onClose,
  onSelect,
  productos,
}: ModalBuscarProductoProps) {
  const [busqueda, setBusqueda] = useState("");

  const productosFiltrados = Array.isArray(productos)
    ? productos.filter((p) =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase())
      )
    : [];

  return (
    <Dialog open={open} onOpenChange={onClose} modal={false}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            Buscar producto ({productos.length} disponibles)
          </DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div className="max-h-60 overflow-y-auto mt-2">
          {productosFiltrados.length === 0 && (
            <div className="text-center text-muted-foreground py-4">
              {Array.isArray(productos) && productos.length > 0
                ? "No se encontraron productos con ese nombre"
                : "No hay productos disponibles"}
            </div>
          )}
          {productosFiltrados.map((producto) => (
            <div
              key={producto.id}
              className="flex items-center justify-between py-2 border-b cursor-pointer hover:bg-muted px-2"
              onClick={() => onSelect(producto)}
            >
              <div>
                <div className="font-medium">{producto.nombre}</div>
                <div className="text-xs text-muted-foreground">
                  {producto.categoria}
                </div>
              </div>
              <div className="font-bold">{formatValue(producto.precio)}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ✅ Modal padre corregido
export function EditPedidoModal({
  pedido,
  isOpen,
  onClose,
  onSuccess,
}: EditPedidoModalProps) {
  const [carrito, setCarrito] = useState<ProductoCarrito[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showProductCatalog, setShowProductCatalog] = useState(false);
  const [catalogoProductos, setCatalogoProductos] = useState<ProductoCatalogo[]>([]);

  const { getToken } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (pedido && isOpen) {
      const productosCarrito: ProductoCarrito[] =
        pedido.productos?.map((item) => ({
          ...item,
          nombre: item.producto?.nombre,
          imagenUrl: item.producto?.imagenUrl,
          categoria: item.producto?.categoria,
        })) || [];

      setCarrito(productosCarrito);
      setObservaciones(pedido.observaciones || "");
    }
  }, [pedido, isOpen]);

  const cargarCatalogo = async () => {
    try {
      const token = await getToken();
      const url = `${process.env.NEXT_PUBLIC_API_URL}/productos/empresa/activos`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const productos = data.productos || data || [];
        const productosFormateados = Array.isArray(productos)
          ? productos.map((producto: any) => ({
              id: producto.id,
              nombre: producto.nombre || "Sin nombre",
              precio: Number(producto.precioVenta || producto.precioCompra || 0),
              categoria:
                producto.categoria?.nombre || producto.categoriaId || "Sin categoría",
              imagenUrl: producto.imagenUrl || undefined,
            }))
          : [];

        setCatalogoProductos(productosFormateados);
        setShowProductCatalog(true);

        toast({
          title: "Catálogo cargado",
          description: `Se cargaron ${productosFormateados.length} productos`,
        });
      } else {
        const errorText = await res.text();
        throw new Error(`Error ${res.status}: ${res.statusText} - ${errorText}`);
      }
    } catch (error) {
      console.error("💥 Error al cargar catálogo:", error);
      toast({
        title: "Error al cargar productos",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
      setCatalogoProductos([]);
    }
  };

  const actualizarCantidad = (productoId: string, delta: number) => {
    setCarrito((prev) =>
      prev.map((item) =>
        item.productoId === productoId
          ? { ...item, cantidad: Math.max(1, item.cantidad + delta) }
          : item
      )
    );
  };

  const establecerCantidad = (productoId: string, nuevaCantidad: number) => {
    setCarrito((prev) =>
      prev.map((item) =>
        item.productoId === productoId
          ? { ...item, cantidad: Math.max(1, nuevaCantidad) }
          : item
      )
    );
  };

  const actualizarPrecio = (productoId: string, nuevoPrecio: string) => {
    const precio = parseFloat(nuevoPrecio) || 0;
    setCarrito((prev) =>
      prev.map((item) =>
        item.productoId === productoId ? { ...item, precio } : item
      )
    );
  };

  const eliminarProducto = (productoId: string) => {
    setCarrito((prev) => prev.filter((item) => item.productoId !== productoId));
  };

  const agregarProducto = (producto: ProductoCatalogo) => {
    const existe = carrito.find((item) => item.productoId === producto.id);

    if (existe) {
      actualizarCantidad(producto.id, 1);
    } else {
      const nuevoItem: ProductoCarrito = {
        id: Date.now().toString(),
        pedidoId: pedido?.id || "",
        productoId: producto.id,
        cantidad: 1,
        precio: producto.precio,
        nombre: producto.nombre,
        imagenUrl: producto.imagenUrl,
        categoria: producto.categoria,
      };
      setCarrito((prev) => [...prev, nuevoItem]);
    }

    setShowProductCatalog(false);
    toast({
      title: "Producto agregado",
      description: `${producto.nombre} se agregó al pedido`,
    });
  };

  const calcularTotal = () =>
    carrito.reduce((sum, item) => sum + item.cantidad * item.precio, 0);

  const handleGuardar = async () => {
    if (carrito.length === 0) {
      toast({
        title: "Error",
        description: "El pedido debe tener al menos un producto",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const token = await getToken();
      const datosActualizados = {
        observaciones,
        productos: carrito.map((item) => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
          precio: item.precio,
        })),
      };

      await invoicesService.actualizarPedido(token!, pedido!.id, datosActualizados);

      toast({
        title: "Pedido actualizado",
        description: "Los cambios se guardaron correctamente",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error al actualizar pedido:", error);
      toast({
        title: "Error al actualizar",
        description: error.message || "No se pudieron guardar los cambios",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!pedido) return null;

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Editar Pedido #{pedido.id.slice(-8).toUpperCase()}</span>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Cliente */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Cliente</h3>
              <p className="text-sm">
                {pedido.cliente?.rasonZocial ||
                  `${pedido.cliente?.nombre || ""} ${pedido.cliente?.apellidos || ""}`}
              </p>
              <p className="text-sm text-gray-500">{pedido.cliente?.ciudad}</p>
            </div>

            {/* Productos */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Productos</h3>
                <Button
                  variant="outline"
                  onClick={cargarCatalogo}
                  type="button"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Agregar Producto
                </Button>
              </div>

              {carrito.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No hay productos en el pedido</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {carrito.map((item) => (
                    <div
                      key={item.productoId}
                      className="bg-white border rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {item.imagenUrl && (
                            <img
                              src={item.imagenUrl}
                              alt={item.nombre}
                              className="h-16 w-16 object-cover rounded"
                            />
                          )}
                          <div>
                            <h4 className="font-medium">
                              {item.nombre || `Producto ${item.productoId.slice(-6)}`}
                            </h4>
                            {item.categoria && (
                              <p className="text-sm text-gray-500">{item.categoria}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          {/* Cantidad */}
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => actualizarCantidad(item.productoId, -1)}
                              disabled={item.cantidad <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              value={item.cantidad}
                              onChange={(e) =>
                                establecerCantidad(
                                  item.productoId,
                                  Math.max(1, parseInt(e.target.value) || 1)
                                )
                              }
                              className="w-16 text-center text-sm"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => actualizarCantidad(item.productoId, 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Precio */}
                          <div className="w-32">
                            <Label className="text-xs">Precio Unit.</Label>
                            <Input
                              type="number"
                              value={item.precio}
                              onChange={(e) =>
                                actualizarPrecio(item.productoId, e.target.value)
                              }
                              className="text-sm"
                            />
                          </div>

                          {/* Subtotal */}
                          <div className="text-right w-24">
                            <p className="text-xs text-gray-500">Subtotal</p>
                            <p className="font-medium">
                              {formatValue(item.cantidad * item.precio)}
                            </p>
                          </div>

                          {/* Eliminar */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarProducto(item.productoId)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Observaciones */}
            <div>
              <Label>Observaciones</Label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full mt-1 p-2 border rounded-md"
                rows={3}
                placeholder="Notas adicionales sobre el pedido..."
              />
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatValue(calcularTotal())}
                </span>
              </div>
              <div className="flex space-x-3">
                <Button
                  onClick={handleGuardar}
                  disabled={isLoading || carrito.length === 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? "Guardando..." : "Guardar Cambios"}
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ✅ Modal hijo se renderiza fuera del modal padre */}
      <ModalBuscarProducto
        open={showProductCatalog}
        onClose={() => setShowProductCatalog(false)}
        onSelect={agregarProducto}
        productos={catalogoProductos}
      />
    </>
  );
}
