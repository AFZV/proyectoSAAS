// CatalogClient.tsx
"use client";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Search as SearchIcon,
  Filter,
  ShoppingCart,
  ArrowUp01Icon,
  ArrowUpCircle,
} from "lucide-react";
import { Pagination } from "./Pagination";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { ProductCard } from "./ProductCard/ProductCard";
import { ProductDetailModal } from "./ProductDetailModal/ProductDetailModal";
import { CategoryFilter } from "./CategoryFilter/CategoryFilter";
import { SearchBar } from "./SearchBar/SearchBar";
import { CartSidebar } from "./CartSidebar/CartSidebar";
import { CheckoutModal } from "./CheckoutModal/CheckoutModal";
import { catalogService } from "../services/catalog.services";
import type { Producto, CarritoItem, Categoria } from "../types/catalog.types";
import { formatValue } from "@/utils/FormartValue";
import { v4 as uuid } from "uuid"; // npm i uuid && npm i -D @types/uuid

interface CatalogClientProps {
  productos: Producto[];
  userType: string;
  userName: string;
}

export function CatalogClient({
  productos: productosIniciales,
  userType,
  userName,
}: CatalogClientProps) {
  // -------------------- ESTADOS BASE --------------------
  const [productos] = useState<Producto[]>(productosIniciales);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [observacionesPorProducto, setObservacionesPorProducto] = useState<
    Record<string, string>
  >({});
  const [observacionGeneral, setObservacionGeneral] = useState<string>("");

  // Flags de hidratación independientes para evitar “carreras”
  const [cartHydrated, setCartHydrated] = React.useState(false);
  const [obsHydrated, setObsHydrated] = React.useState(false);

  // Clerk (cliente)
  const { userId, isSignedIn, getToken } = useAuth();

  // empresaNs: leer sincrónicamente al primer render
  const [empresaNs] = React.useState<string>(() => {
    if (typeof window === "undefined") return "default";
    try {
      return localStorage.getItem("empresaId") || "default";
    } catch {
      return "default";
    }
  });

  // deviceId: generar/leer sincrónicamente al primer render
  const [deviceId] = React.useState<string>(() => {
    if (typeof window === "undefined") return "guest";
    try {
      let d = localStorage.getItem("bgacloud:deviceId");
      if (!d) {
        d = uuid();
        localStorage.setItem("bgacloud:deviceId", d);
      }
      return d;
    } catch {
      return "guest";
    }
  });

  // Namespace final estable desde el inicio: empresa + (user | guest:device)
  const ns = React.useMemo(() => {
    const userPart =
      isSignedIn && userId ? `user:${userId}` : `guest:${deviceId}`;
    return `${empresaNs}:${userPart}`;
  }, [empresaNs, isSignedIn, userId, deviceId]);

  // Claves por espacio
  const LS_CART_KEY = `bgacloud:cart:v1:${ns}`;
  const LS_OBS_PROD_KEY = `bgacloud:cart:obsPorProducto:v1:${ns}`;
  const LS_OBS_GENERAL_KEY = `bgacloud:cart:obsGeneral:v1:${ns}`;

  // Filtros/UI
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<
    string | null
  >(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const productosPorPagina = 100;

  // Detalle
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { toast } = useToast();

  // -------------------- HIDRATAR DESDE LOCALSTORAGE --------------------
  // Carrito
  useEffect(() => {
    try {
      const rawCart = localStorage.getItem(LS_CART_KEY);
      setCarrito(rawCart ? JSON.parse(rawCart) : []);
    } catch {
      setCarrito([]);
    } finally {
      setCartHydrated(true);
    }
  }, [LS_CART_KEY]);

  // Observaciones (por producto + general)
  useEffect(() => {
    try {
      const rawObsProd = localStorage.getItem(LS_OBS_PROD_KEY);
      const rawObsGeneral = localStorage.getItem(LS_OBS_GENERAL_KEY);
      setObservacionesPorProducto(rawObsProd ? JSON.parse(rawObsProd) : {});
      setObservacionGeneral(rawObsGeneral ? JSON.parse(rawObsGeneral) : "");
    } catch (e) {
      setObservacionesPorProducto({});
      setObservacionGeneral("");
      console.warn("No se pudo leer observaciones de localStorage", e);
    } finally {
      setObsHydrated(true);
    }
  }, [LS_OBS_PROD_KEY, LS_OBS_GENERAL_KEY]);

  // -------------------- GUARDAR EN LOCALSTORAGE --------------------
  // Guardar carrito SOLO cuando ya hidrató carrito
  useEffect(() => {
    if (!cartHydrated) return;
    try {
      localStorage.setItem(LS_CART_KEY, JSON.stringify(carrito));
    } catch {}
  }, [cartHydrated, LS_CART_KEY, carrito]);

  // Guardar obs por producto SOLO cuando ya hidrató observaciones
  useEffect(() => {
    if (!obsHydrated) return;
    try {
      const limpio: Record<string, string> = {};
      for (const [k, v] of Object.entries(observacionesPorProducto)) {
        const t = (v ?? "").trim();
        if (t) limpio[k] = t;
      }
      localStorage.setItem(LS_OBS_PROD_KEY, JSON.stringify(limpio));
    } catch {}
  }, [obsHydrated, LS_OBS_PROD_KEY, observacionesPorProducto]);

  // Guardar obs general SOLO cuando ya hidrató observaciones
  useEffect(() => {
    if (!obsHydrated) return;
    try {
      localStorage.setItem(
        LS_OBS_GENERAL_KEY,
        JSON.stringify(observacionGeneral)
      );
    } catch {}
  }, [obsHydrated, LS_OBS_GENERAL_KEY, observacionGeneral]);

  // -------------------- CATEGORÍAS --------------------
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const categoriasData = await catalogService.getCategorias(token);
          setCategorias(categoriasData);
        }
      } catch (error) {
        console.error("Error al cargar categorías:", error);
      }
    })();
  }, [getToken]);

  // -------------------- SETTERS OBS --------------------
  const setObservacionProducto = (productoId: string, texto: string) => {
    setObservacionesPorProducto((prev) => {
      const next = { ...prev };
      const t = (texto ?? "").trim();
      if (t) next[productoId] = t;
      else delete next[productoId];
      return next;
    });
  };

  const getObservacionProducto = (productoId: string) => {
    return observacionesPorProducto[productoId] || "";
  };

  // -------------------- CHECKOUT (texto observaciones) --------------------
  const buildTextoObservacionesCheckout = () => {
    const lineas = Object.entries(observacionesPorProducto)
      .filter(([, obs]) => obs?.trim())
      .map(([id, obs]) => {
        const p = productos.find((x) => x.id === id);
        const nombre = p?.nombre ?? "Producto";
        return `• ${nombre}: ${obs.trim()}`;
      });

    const bloqueProductos = lineas.length
      ? `OBSERVACIONES POR PRODUCTO:\n${lineas.join("\n")}`
      : "";
    const bloqueGeneral = observacionGeneral.trim()
      ? `${
          lineas.length ? "\n\n" : ""
        }OBSERVACIÓN GENERAL:\n${observacionGeneral.trim()}`
      : "";

    return `${bloqueProductos}${bloqueGeneral}`.trim();
  };

  // -------------------- FILTROS / PAGINACIÓN --------------------
  const productosFiltrados = useMemo(() => {
    let filtered = productos;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (producto) =>
          producto.nombre.toLowerCase().includes(term) ||
          producto.categoria.toLowerCase().includes(term)
      );
    }

    if (categoriaSeleccionada) {
      const categoriaNombre = categorias.find(
        (c) => c.idCategoria === categoriaSeleccionada
      )?.nombre;
      if (categoriaNombre) {
        filtered = filtered.filter(
          (producto) =>
            producto.categoria.toLowerCase() === categoriaNombre.toLowerCase()
        );
      }
    }

    return filtered;
  }, [productos, searchTerm, categoriaSeleccionada, categorias]);

  const totalPaginas = Math.ceil(
    productosFiltrados.length / productosPorPagina
  );

  const productosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * productosPorPagina;
    const fin = inicio + productosPorPagina;
    return productosFiltrados.slice(inicio, fin);
  }, [productosFiltrados, paginaActual]);

  const cantidadPorCategoria = useMemo(() => {
    const counts: Record<string, number> = {};

    categorias.forEach((categoria) => {
      const count = productos.filter(
        (producto) =>
          producto.categoria.toLowerCase() === categoria.nombre.toLowerCase()
      ).length;
      counts[categoria.idCategoria] = count;
    });

    return counts;
  }, [productos, categorias]);

  useEffect(() => {
    setPaginaActual(1);
  }, [searchTerm, categoriaSeleccionada]);

  // -------------------- DETALLE PRODUCTO --------------------
  const handleVerDetalles = (producto: Producto) => {
    setSelectedProduct(producto);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedProduct(null);
  };

  // -------------------- CARRITO --------------------
  const agregarAlCarrito = (producto: Producto, cantidad: number = 1) => {
    setCarrito((prevCarrito) => {
      const existente = prevCarrito.find((item) => item.id === producto.id);

      if (existente) {
        return prevCarrito.map((item) =>
          item.id === producto.id
            ? { ...item, cantidad: item.cantidad + cantidad }
            : item
        );
      } else {
        return [...prevCarrito, { ...producto, cantidad }];
      }
    });

    toast({
      title: "Producto agregado",
      description: `${producto.nombre} (${cantidad}) agregado al carrito`,
      duration: 500,
    });
  };

  const actualizarCantidadCarrito = (
    productoId: string,
    nuevaCantidad: number
  ) => {
    if (nuevaCantidad <= 0) {
      removerDelCarrito(productoId);
      return;
    }

    setCarrito((prevCarrito) =>
      prevCarrito.map((item) =>
        item.id === productoId ? { ...item, cantidad: nuevaCantidad } : item
      )
    );
  };

  const removerDelCarrito = (productoId: string) => {
    setCarrito((prevCarrito) =>
      prevCarrito.filter((item) => item.id !== productoId)
    );

    toast({
      title: "Producto eliminado",
      description: "El producto fue eliminado del carrito",
      duration: 500,
    });
  };

  const limpiarCarrito = () => {
    setCarrito([]);
    localStorage.removeItem(LS_CART_KEY);
    // Si también quieres limpiar observaciones:
    // setObservacionesPorProducto({});
    // localStorage.removeItem(LS_OBS_PROD_KEY);
    // setObservacionGeneral("");
    // localStorage.removeItem(LS_OBS_GENERAL_KEY);

    toast({
      title: "Carrito limpiado",
      description: "Se eliminaron todos los productos del carrito",
      duration: 500,
    });
  };

  const handleSearch = (term: string) => setSearchTerm(term);

  const handleCategoriaChange = (categoriaId: string | null) =>
    setCategoriaSeleccionada(categoriaId);

  const getProductoEnCarrito = (productoId: string) =>
    carrito.find((item) => item.id === productoId);

  const handleCheckout = () => {
    // const textoInicial = buildTextoObservacionesCheckout(); // si lo necesitas
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handlePedidoCreado = () => {
    limpiarCarrito();
    setIsCheckoutOpen(false);
    toast({
      title: "Pedido creado exitosamente",
      description: "Tu pedido ha sido registrado correctamente",
      duration: 500,
    });
  };

  const handleDescargarImagen = async (producto: Producto) => {
    setSelectedProduct(producto);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const temp = document.createElement("div");
      Object.assign(temp.style, {
        position: "fixed",
        left: "-10000px",
        top: "0",
        width: "1200px",
        padding: "24px",
        background: "#ffffff",
        color: "#111827",
        fontFamily: "Inter, system-ui, Arial, sans-serif",
        display: "block",
        zIndex: "2147483647",
      });

      temp.innerHTML = `
      <div style="display:flex; gap:32px; align-items:flex-start;">
        <div style="
          flex:0 0 55%;
          display:flex; align-items:center; justify-content:center;
          background:#f8fafc; border:1px solid #e5e7eb;
          border-radius:16px; padding:16px; min-height:600px;">
          <img src="${producto.imagenUrl || "/placeholder-product.png"}"
               alt="${producto.nombre}" crossOrigin="anonymous"
               style="max-width:100%; max-height:100%; object-fit:contain; border-radius:12px;" />
        </div>
        <div style="flex:1; display:flex; flex-direction:column; gap:24px;">
          <div>
            <div style="font-size:16px; color:#374151; margin-bottom:8px;">Descripción</div>
            <div style="font-size:18px; line-height:1.6; color:#111827;">
              ${producto.nombre || "Sin descripción"}
            </div>
          </div>
          <div>
            <div style="font-size:16px; color:#374151; margin-bottom:8px;">Categoría</div>
            <div style="
              display:inline-block; padding:8px 12px; background:#eef2ff;
              color:#3730a3; font-weight:600; border-radius:999px; font-size:16px;">
              ${producto.categoria}
            </div>
          </div>
          <div>
            <div style="font-size:16px; color:#374151; margin-bottom:8px;">Precio de venta</div>
            <div style="font-size:32px; font-weight:800; color:#065f46;">
              ${formatValue(producto.precio)}
            </div>
          </div>
          <div>
            <div style="font-size:16px; color:#374151; margin-bottom:8px;">Stock disponible</div>
            <div style="font-size:28px; font-weight:800; color:${
              producto.stock > 10
                ? "#065f46"
                : producto.stock > 0
                ? "#92400e"
                : "#991b1b"
            };">
              ${producto.stock}
            </div>
          </div>
        </div>
      </div>`;

      document.body.appendChild(temp);
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      const canvas = await html2canvas(temp, {
        backgroundColor: "#ffffff",
        useCORS: true,
        scale: Math.min(3, (window.devicePixelRatio || 1) * 2),
      });

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${(producto.nombre || "producto").replace(
        /\s+/g,
        "_"
      )}.png`;
      link.click();

      temp.remove();
    } catch (err) {
      console.error("Error generando imagen:", err);
    }
  };
  // -------------------- RENDER --------------------
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Bienvenida */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-blue-700">
            <span>
              <strong>Bienvenido:</strong>{" "}
              <span className="text-blue-800 font-semibold">{userName}</span>
            </span>
            <span className="text-blue-400">•</span>
            <span>
              <strong>Rol:</strong>{" "}
              <span className="capitalize bg-blue-100 px-2 py-1 rounded-full text-blue-800 font-medium">
                {userType}
              </span>
            </span>
          </div>

          {userType !== "admin" && (
            <div className="hidden sm:flex items-center gap-6">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {productos.length}
                </div>
                <div className="text-xs text-blue-600">Productos</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {productos.filter((p) => p.stock > 0).length}
                </div>
                <div className="text-xs text-green-600">En Stock</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controles superiores */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex-1 max-w-md">
          <SearchBar
            onSearch={handleSearch}
            resultCount={productosFiltrados.length}
            isLoading={isLoading}
          />
        </div>

        {/* Carrito (móvil) */}
        <div className="lg:hidden">
          <CartSidebar
            carrito={carrito}
            isOpen={isCartOpen}
            onOpenChange={setIsCartOpen}
            onUpdateCantidad={actualizarCantidadCarrito}
            onRemoveItem={removerDelCarrito}
            onClearCart={limpiarCarrito}
            onCheckout={handleCheckout}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Filtros por categoría */}
      <CategoryFilter
        categorias={categorias}
        categoriaSeleccionada={categoriaSeleccionada}
        onCategoriaChange={handleCategoriaChange}
        cantidadProductos={productosFiltrados.length}
        cantidadPorCategoria={cantidadPorCategoria}
      />

      {/* Layout principal */}
      <div className="flex gap-6">
        {/* Grid */}
        <div className="flex-1">
          <Pagination
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            setPaginaActual={setPaginaActual}
          />

          {productosFiltrados.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  {searchTerm || categoriaSeleccionada ? (
                    <SearchIcon className="w-8 h-8 text-muted-foreground" />
                  ) : (
                    <Package className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">
                    {searchTerm || categoriaSeleccionada
                      ? "No se encontraron productos"
                      : "No hay productos disponibles"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || categoriaSeleccionada
                      ? "Intenta con otros términos de búsqueda o categorías"
                      : "Aún no se han agregado productos al catálogo"}
                  </p>
                  {(searchTerm || categoriaSeleccionada) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setCategoriaSeleccionada(null);
                      }}
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 auto-rows-fr">
              {productosPaginados.map((producto) => {
                const enCarrito = getProductoEnCarrito(producto.id);
                return (
                  <ProductCard
                    key={producto.id}
                    producto={producto}
                    onAgregarAlCarrito={agregarAlCarrito}
                    onDescargarImagen={handleDescargarImagen}
                    onVerDetalles={handleVerDetalles}
                    isInCart={!!enCarrito}
                    cantidadEnCarrito={enCarrito?.cantidad || 0}
                    observacion={observacionesPorProducto[producto.id] || ""}
                    onChangeObservacion={(texto) =>
                      setObservacionProducto(producto.id, texto)
                    }
                  />
                );
              })}
            </div>
          )}

          <Pagination
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            setPaginaActual={setPaginaActual}
          />
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 
             bg-blue-600 hover:bg-blue-700 text-white font-semibold 
             rounded-full shadow-lg transition-all duration-300 
             hover:scale-105"
          >
            <ArrowUpCircle className="w-5 h-5" />
            Ir Arriba
          </button>
        </div>

        {/* Carrito lateral (desktop) */}
        <div className="hidden lg:block w-80">
          <div className="sticky top-6">
            <Card className="border-blue-200 shadow-lg shadow-blue-500/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2 text-blue-700">
                    <ShoppingCart className="w-4 h-4" />
                    Mi Carrito
                  </h3>
                  {carrito.length > 0 && (
                    <Badge className="bg-blue-500 text-white">
                      {carrito.reduce((sum, item) => sum + item.cantidad, 0)}{" "}
                      items
                    </Badge>
                  )}
                </div>

                {carrito.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Tu carrito está vacío</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {carrito.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center space-x-2 text-sm p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <img
                            src={item.imagenUrl || "/placeholder-product.png"}
                            alt={item.nombre}
                            className="w-8 h-8 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium">
                              {item.nombre}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.cantidad}x {formatValue(item.precio)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={() => setIsCartOpen(true)}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-blue-500/25"
                      size="sm"
                    >
                      Ver Carrito Completo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Carrito lateral móvil */}
      <CartSidebar
        carrito={carrito}
        isOpen={isCartOpen}
        onOpenChange={setIsCartOpen}
        onUpdateCantidad={actualizarCantidadCarrito}
        onRemoveItem={removerDelCarrito}
        onClearCart={limpiarCarrito}
        onCheckout={handleCheckout}
        isLoading={isLoading}
      />

      {/* Modal de checkout */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        carrito={carrito}
        onPedidoCreado={handlePedidoCreado}
        initialNotes={buildTextoObservacionesCheckout()}
        onNotesChange={(nuevoTexto) => setObservacionGeneral(nuevoTexto)}
      />

      {/* Modal de detalles */}
      <ProductDetailModal
        producto={selectedProduct}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onAgregarAlCarrito={agregarAlCarrito}
        isInCart={!!getProductoEnCarrito(selectedProduct?.id || "")}
        cantidadEnCarrito={
          getProductoEnCarrito(selectedProduct?.id || "")?.cantidad || 0
        }
        observacion={
          selectedProduct ? getObservacionProducto(selectedProduct.id) : ""
        }
        onChangeObservacion={(texto) => {
          if (selectedProduct)
            setObservacionProducto(selectedProduct.id, texto);
        }}
      />
    </div>
  );
}
