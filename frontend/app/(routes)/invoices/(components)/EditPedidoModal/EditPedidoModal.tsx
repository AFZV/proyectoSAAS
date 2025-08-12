"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Search,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { formatValue } from "@/utils/FormartValue";
import { invoicesService } from "../../services/invoices.service";
import type { Pedido, DetallePedido } from "../../types/invoices.types";

/* ===== Tipos locales (ligeros) para clientes y productos ===== */
type ClienteLite = {
  id: string;
  nit: string;
  nombre: string;
  apellidos?: string;
  rasonZocial?: string;
  telefono?: string;
  email?: string;
  ciudad?: string;
};

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

/* ===== Modal de búsqueda de productos (tu mismo código) ===== */
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
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

/* ===== NUEVO: Modal selector de Cliente (carga todos + filtro local) ===== */
function ClienteSelectorModal({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (c: ClienteLite) => void;
}) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [clientes, setClientes] = useState<ClienteLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalize = (s: string) =>
    (s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");
  const highlight = (text: string, q: string) => {
    if (!q) return text;
    const idx = normalize(text).indexOf(normalize(q));
    if (idx === -1) return text;
    const end = idx + q.length;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200">{text.slice(idx, end)}</mark>
        {text.slice(end)}
      </>
    );
  };

  // Cargar todos los clientes al abrir
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const token = await getToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/clientes/all-min`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("No se pudo cargar la lista de clientes");
        const data: ClienteLite[] = await res.json();
        if (mounted) setClientes(Array.isArray(data) ? data : []);
      } catch (err: any) {
        toast({
          title: "Error",
          description: err?.message || "Fallo cargando clientes",
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [open, getToken, toast]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return clientes;
    const qDigits = onlyDigits(q);
    const isNit = !!qDigits;

    const byName = (c: ClienteLite) => {
      const full = `${c.rasonZocial || ""} ${c.nombre || ""} ${
        c.apellidos || ""
      }`.trim();
      return normalize(full).includes(normalize(q));
    };
    const byNit = (c: ClienteLite) => onlyDigits(c.nit || "").includes(qDigits);

    let res = clientes.filter((c) =>
      isNit ? byNit(c) || byName(c) : byName(c)
    );

    // ordenar: exactos por NIT primero, luego alfabético
    if (isNit) {
      res = res.sort((a, b) => {
        const aExact = onlyDigits(a.nit || "") === qDigits ? 0 : 1;
        const bExact = onlyDigits(b.nit || "") === qDigits ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        const an = (
          a.rasonZocial || `${a.nombre || ""} ${a.apellidos || ""}`
        ).trim();
        const bn = (
          b.rasonZocial || `${b.nombre || ""} ${b.apellidos || ""}`
        ).trim();
        return an.localeCompare(bn, "es", { sensitivity: "base" });
      });
    } else {
      res = res.sort((a, b) => {
        const an = (
          a.rasonZocial || `${a.nombre || ""} ${a.apellidos || ""}`
        ).trim();
        const bn = (
          b.rasonZocial || `${b.nombre || ""} ${b.apellidos || ""}`
        ).trim();
        return an.localeCompare(bn, "es", { sensitivity: "base" });
      });
    }
    return res;
  }, [clientes, query]);

  const handleSelect = (c: ClienteLite) => {
    onSelect(c);
    onOpenChange(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      onOpenChange(true);
      return;
    }
    if (!filtered.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((p) => (p + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((p) => (p - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sel = filtered[activeIndex] || filtered[0];
      if (sel) handleSelect(sel);
    } else if (e.key === "Escape") {
      onOpenChange(false);
      setActiveIndex(-1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[90vw] max-h-[80vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Seleccionar cliente</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-3 flex gap-2">
          <Input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
            }}
            onKeyDown={onKeyDown}
            placeholder="Escribe nombre/apellidos o NIT…"
          />
          <Button type="button" variant="secondary" disabled>
            <Search className="w-4 h-4" />
          </Button>
        </div>

        <div className="overflow-auto max-h-[60vh] border-t">
          {loading && (
            <div className="px-6 py-4 text-sm text-muted-foreground">
              Cargando clientes…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="px-6 py-4 text-sm text-muted-foreground">
              No hay coincidencias
            </div>
          )}
          {!loading &&
            filtered.map((c, i) => {
              const lineaNombre =
                (c.rasonZocial || "").trim() || "(Sin razón social)";
              const nombreCompleto = `${c.nombre || ""} ${
                c.apellidos || ""
              }`.trim();
              const isActive = i === activeIndex;

              return (
                <button
                  key={c.id}
                  type="button"
                  className={`w-full text-left px-6 py-3 text-sm hover:bg-muted/60 ${
                    isActive ? "bg-muted/80" : ""
                  }`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => handleSelect(c)}
                >
                  <div className="font-medium text-base">
                    {highlight(lineaNombre, query)}
                  </div>
                  {nombreCompleto && (
                    <div className="text-sm text-gray-600">
                      {highlight(nombreCompleto, query)}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    NIT: {highlight(c.nit || "", query.replace(/\D/g, ""))}
                  </div>
                </button>
              );
            })}
        </div>

        <div className="px-6 py-3 border-t text-xs text-muted-foreground">
          {filtered.length} resultados {query ? "filtrados" : "totales"}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ===== EditPedidoModal con cambio de cliente ===== */
interface EditPedidoModalProps {
  pedido: Pedido | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

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
  const [catalogoProductos, setCatalogoProductos] = useState<
    ProductoCatalogo[]
  >([]);

  // NUEVO: cliente seleccionado y modal
  const [clienteSel, setClienteSel] = useState<ClienteLite | null>(null);
  const [openClienteModal, setOpenClienteModal] = useState(false);

  const { getToken } = useAuth();
  const { toast } = useToast();

  // Al abrir: mapear productos y setear cliente inicial
  useEffect(() => {
    if (pedido && isOpen) {
      const productosCarrito: ProductoCarrito[] =
        pedido.productos?.map((item) => ({
          ...item,
          nombre: item.producto?.nombre,
          imagenUrl: item.producto?.imagenUrl,
          categoria:
            (item.producto as any)?.categoria?.nombre ||
            (item.producto as any)?.categoriaId,
        })) || [];

      setCarrito(productosCarrito);
      setObservaciones(pedido.observaciones || "");

      const c = pedido?.cliente;
      setClienteSel(
        c
          ? {
              id: c.id,
              nit: c.nit ?? "", // <-- fuerza string
              nombre: c.nombre ?? "",
              apellidos: c.apellidos ?? "",
              rasonZocial: c.rasonZocial ?? "",
              telefono: c.telefono ?? "",
              email: c.email ?? "", // <-- fuerza string
              ciudad: c.ciudad ?? "",
            }
          : null
      );
    }
  }, [pedido, isOpen]);

  // Cargar catálogo de productos
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
              precio: Number(
                producto.precioVenta || producto.precioCompra || 0
              ),
              categoria:
                producto?.categoria?.nombre ||
                producto?.categoriaId ||
                "Sin categoría",
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
        console.error("❌ Error del servidor:", {
          status: res.status,
          statusText: res.statusText,
          body: errorText,
        });
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
    } catch (error: any) {
      console.error("💥 Error al cargar catálogo:", error);
      toast({
        title: "Error al cargar productos",
        description: error?.message || "Error desconocido",
        variant: "destructive",
      });
      setCatalogoProductos([]);
    }
  };

  // Helpers carrito
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
    setCarrito((prev) => prev.filter((i) => i.productoId !== productoId));
  };
  const agregarProducto = (producto: ProductoCatalogo) => {
    const existe = carrito.find((i) => i.productoId === producto.id);
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
      duration: 600,
    });
  };

  const calcularTotal = () =>
    carrito.reduce((sum, i) => sum + i.cantidad * i.precio, 0);

  // Guardar (incluye clienteId NUEVO si se cambió)
  const handleGuardar = async () => {
    if (!pedido) return;
    if (carrito.length === 0) {
      toast({
        title: "Error",
        description: "El pedido debe tener al menos un producto",
        variant: "destructive",
      });
      return;
    }
    if (!clienteSel?.id) {
      toast({
        title: "Selecciona un cliente",
        description: "Debes asignar un cliente al pedido",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const token = await getToken();

      const datosActualizados: any = {
        observaciones,
        clienteId: clienteSel.id, // <-- NUEVO
        productos: carrito.map((item) => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
          precio: item.precio,
        })),
      };

      await invoicesService.actualizarPedido(
        token!,
        pedido.id,
        datosActualizados
      );

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
        description: error?.message || "No se pudieron guardar los cambios",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!pedido) return null;

  const estadoActual =
    pedido.estados && pedido.estados.length > 0
      ? pedido.estados
          .slice()
          .sort(
            (a, b) =>
              new Date(b.fechaEstado).getTime() -
              new Date(a.fechaEstado).getTime()
          )[0].estado
      : "GENERADO";

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
              <span>Editar Pedido #{pedido.id.slice(5).toUpperCase()}</span>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* ===== Cliente (con botón para cambiar) ===== */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Cliente</h3>
                  <p className="text-sm">
                    {clienteSel?.rasonZocial ||
                      `${clienteSel?.nombre || ""} ${
                        clienteSel?.apellidos || ""
                      }`}
                  </p>
                  <p className="text-sm text-gray-500">
                    {clienteSel?.ciudad}{" "}
                    {clienteSel?.nit && `• NIT: ${clienteSel.nit}`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setOpenClienteModal(true)}
                  className="flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Cambiar cliente
                </Button>
              </div>
            </div>

            {/* ===== Productos ===== */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Productos</h3>
                <div className="flex justify-end mb-2">
                  <Button
                    variant="outline"
                    onClick={cargarCatalogo}
                    type="button"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Agregar Producto
                  </Button>
                </div>
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
                              {item.nombre ||
                                `Producto ${item.productoId.slice(-6)}`}
                            </h4>
                            {item.categoria && (
                              <p className="text-sm text-gray-500">
                                {item.categoria}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          {/* Cantidad */}
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                actualizarCantidad(item.productoId, -1)
                              }
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
                              onBlur={(e) =>
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
                              onClick={() =>
                                actualizarCantidad(item.productoId, 1)
                              }
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
                                actualizarPrecio(
                                  item.productoId,
                                  e.target.value
                                )
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

            {/* Total y acciones */}
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

      {/* Modal de catálogo de productos */}
      {showProductCatalog && (
        <ModalBuscarProducto
          open={showProductCatalog}
          onClose={() => setShowProductCatalog(false)}
          onSelect={agregarProducto}
          productos={catalogoProductos}
        />
      )}

      {/* NUEVO: Modal de selección de cliente */}
      <ClienteSelectorModal
        open={openClienteModal}
        onOpenChange={setOpenClienteModal}
        onSelect={(c) => {
          setClienteSel(c);
          // opcional: toast
          // toast({ title: "Cliente seleccionado", description: c.rasonZocial || `${c.nombre} ${c.apellidos}` });
        }}
      />
    </>
  );
}
