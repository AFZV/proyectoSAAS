"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  Package,
  MessageCircle,
  Megaphone,
  ShoppingCart,
  Plus,
  Minus,
  X,
  Trash2,
} from "lucide-react";
import { formatValue } from "@/utils/FormartValue";
import type {
  CatalogoPublicoResponse,
  ProductoPublico,
} from "../../(routes)/catalog/types/catalog.types";

interface PublicCatalogClientProps {
  data: CatalogoPublicoResponse;
}

// id del producto -> cantidad en el carrito
type Carrito = Record<string, number>;

export function PublicCatalogClient({ data }: PublicCatalogClientProps) {
  const { empresa, categorias, productos } = data;
  const config = empresa.config ?? {};
  const colorPrimario = config.colorPrimario || "#2563eb";
  const colorSecundario = config.colorSecundario || "#f59e0b";
  const colorFondo = config.colorFondo || "#f8fafc";
  const colorMarcoImagenes = config.colorMarcoImagenes || "#f1f5f9";
  const conCarrito = config.permitirCarrito ?? false;

  const [busqueda, setBusqueda] = useState("");
  const [categoriaId, setCategoriaId] = useState<string>("todas");
  const [carrito, setCarrito] = useState<Carrito>({});
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [nombreCliente, setNombreCliente] = useState("");

  const categoriaNombrePorId = useMemo(
    () => new Map(categorias.map((c) => [c.idCategoria, c.nombre])),
    [categorias],
  );

  const productosFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      const coincideBusqueda = !term || p.nombre.toLowerCase().includes(term);
      const coincideCategoria =
        categoriaId === "todas" ||
        p.categoria === categoriaNombrePorId.get(categoriaId);
      return coincideBusqueda && coincideCategoria;
    });
  }, [productos, busqueda, categoriaId, categoriaNombrePorId]);

  const productoPorId = useMemo(
    () => new Map(productos.map((p) => [p.id, p])),
    [productos],
  );

  const itemsCarrito = useMemo(
    () =>
      Object.entries(carrito)
        .filter(([, cantidad]) => cantidad > 0)
        .map(([id, cantidad]) => ({ producto: productoPorId.get(id), cantidad }))
        .filter(
          (item): item is { producto: ProductoPublico; cantidad: number } =>
            !!item.producto,
        ),
    [carrito, productoPorId],
  );

  const totalItems = itemsCarrito.reduce((acc, i) => acc + i.cantidad, 0);
  const totalCarrito = itemsCarrito.every((i) => i.producto.precio !== null)
    ? itemsCarrito.reduce(
        (acc, i) => acc + (i.producto.precio ?? 0) * i.cantidad,
        0,
      )
    : null;

  const cambiarCantidad = (id: string, delta: number, maxStock: number | null) => {
    setCarrito((prev) => {
      const actual = prev[id] ?? 0;
      let nueva = actual + delta;
      if (nueva < 0) nueva = 0;
      if (maxStock !== null && nueva > maxStock) nueva = maxStock;
      return { ...prev, [id]: nueva };
    });
  };

  // A diferencia de cambiarCantidad (+1/-1), esta fija el valor exacto que el usuario
  // escriba en el input de cantidad.
  const fijarCantidad = (id: string, valor: number, maxStock: number | null) => {
    let nueva = Number.isFinite(valor) ? Math.floor(valor) : 0;
    if (nueva < 0) nueva = 0;
    if (maxStock !== null && nueva > maxStock) nueva = maxStock;
    setCarrito((prev) => ({ ...prev, [id]: nueva }));
  };

  const quitarDelCarrito = (id: string) => {
    setCarrito((prev) => {
      const copia = { ...prev };
      delete copia[id];
      return copia;
    });
  };

  const whatsappLinkProducto = (nombreProducto: string) => {
    if (!config.whatsappContacto) return null;
    const texto = encodeURIComponent(
      `Hola, estoy interesado en: ${nombreProducto}`,
    );
    return `https://wa.me/${config.whatsappContacto}?text=${texto}`;
  };

  // Arma el mensaje del carrito. Incluye una línea REF con los ids y cantidades en un
  // formato compacto y estable, pensada para que a futuro la app pueda leer este mensaje
  // (pegado o reenviado) y montar el pedido automáticamente sin digitarlo de nuevo.
  const construirMensajeCarrito = () => {
    const lineas = itemsCarrito.map((item, i) => {
      const subtotal =
        item.producto.precio !== null
          ? ` = ${formatValue(item.producto.precio * item.cantidad)}`
          : "";
      return `${i + 1}. ${item.producto.nombre} x${item.cantidad}${subtotal}`;
    });

    const partes = [
      `🛒 *Pedido - ${empresa.nombre}*`,
      nombreCliente.trim() ? `Cliente: ${nombreCliente.trim()}` : null,
      "",
      lineas.join("\n"),
      totalCarrito !== null ? `\n*Total: ${formatValue(totalCarrito)}*` : null,
      "\n— código interno, no borrar (permite montar el pedido en el sistema) —",
      `REF:CATPED:1:${itemsCarrito
        .map((i) => `${i.producto.id}:${i.cantidad}`)
        .join(",")}`,
    ].filter((p) => p !== null);

    return partes.join("\n");
  };

  const enviarCarritoPorWhatsapp = () => {
    if (!config.whatsappContacto || itemsCarrito.length === 0) return;
    const texto = encodeURIComponent(construirMensajeCarrito());
    window.open(
      `https://wa.me/${config.whatsappContacto}?text=${texto}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: colorFondo }}>
      {/* Aviso destacado */}
      {config.avisoDestacado && (
        <div
          className="text-white text-xs sm:text-sm font-medium text-center py-2 px-4 flex items-center justify-center gap-2"
          style={{ backgroundColor: colorSecundario }}
        >
          <Megaphone className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{config.avisoDestacado}</span>
        </div>
      )}

      {/* Encabezado con marca de la empresa */}
      <div
        className="relative text-white"
        style={{
          background: config.bannerUrl
            ? undefined
            : `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})`,
        }}
      >
        {config.bannerUrl && (
          <>
            <img
              src={config.bannerUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
          </>
        )}

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8 flex items-center gap-4">
          {empresa.logoUrl && (
            <img
              src={empresa.logoUrl}
              alt={empresa.nombre}
              className="w-14 h-14 rounded-xl bg-white object-contain p-1 shadow-md flex-shrink-0"
            />
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {empresa.nombre}
            </h1>
            {config.mensajeBienvenida && (
              <p className="text-white/90 text-sm sm:text-base mt-1">
                {config.mensajeBienvenida}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Buscador y filtros */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2"
              style={{ ["--tw-ring-color" as any]: colorPrimario }}
            />
          </div>

          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className="rounded-md border border-slate-200 text-sm px-3 py-2 sm:w-56"
          >
            <option value="todas">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.idCategoria} value={c.idCategoria}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid de productos */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <p className="text-sm text-slate-500 mb-4">
          {productosFiltrados.length}{" "}
          {productosFiltrados.length === 1
            ? "producto encontrado"
            : "productos encontrados"}
        </p>

        {productosFiltrados.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Package className="w-10 h-10 mx-auto mb-2" />
            No se encontraron productos con ese criterio.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {productosFiltrados.map((p) => {
              const link = whatsappLinkProducto(p.nombre);
              const cantidadEnCarrito = carrito[p.id] ?? 0;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow"
                >
                  {/* Imagen completa (sin recortar), con marco de color alrededor */}
                  <div
                    className="relative aspect-square p-3"
                    style={{ backgroundColor: colorMarcoImagenes }}
                  >
                    <img
                      src={p.imagenUrl || "/placeholder-product.png"}
                      alt={p.nombre}
                      className="w-full h-full object-contain"
                    />
                    <span className="absolute top-2 left-2 text-[11px] bg-white/90 text-slate-700 px-2 py-0.5 rounded-full">
                      {p.categoria}
                    </span>
                  </div>

                  <div className="p-3 flex flex-col gap-1.5 flex-1">
                    <h3 className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">
                      {p.nombre}
                    </h3>
                    {p.stock !== null && (
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Stock: {p.stock}</span>
                      </div>
                    )}
                    {p.precio !== null ? (
                      <p
                        className="text-lg font-bold mt-auto"
                        style={{ color: colorPrimario }}
                      >
                        {formatValue(p.precio)}
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-slate-400 mt-auto">
                        Consultar precio
                      </p>
                    )}

                    {conCarrito ? (
                      cantidadEnCarrito > 0 ? (
                        <div className="flex items-center justify-between border rounded-md mt-1">
                          <button
                            onClick={() =>
                              cambiarCantidad(p.id, -1, p.stock)
                            }
                            className="p-1.5 hover:bg-slate-100"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={p.stock ?? undefined}
                            value={cantidadEnCarrito}
                            onChange={(e) =>
                              fijarCantidad(p.id, e.target.valueAsNumber, p.stock)
                            }
                            onFocus={(e) => e.target.select()}
                            className="w-10 text-sm font-medium text-center border-0 focus:outline-none focus:ring-0 bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            onClick={() => cambiarCantidad(p.id, 1, p.stock)}
                            disabled={p.stock !== null && cantidadEnCarrito >= p.stock}
                            className="p-1.5 hover:bg-slate-100 disabled:opacity-30"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => cambiarCantidad(p.id, 1, p.stock)}
                          className="flex items-center justify-center gap-1.5 text-xs font-medium text-white rounded-md py-1.5 mt-1"
                          style={{ backgroundColor: colorPrimario }}
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Agregar al carrito
                        </button>
                      )
                    ) : (
                      link && (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 text-xs font-medium text-white rounded-md py-1.5 mt-1"
                          style={{ backgroundColor: colorSecundario }}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Pedir por WhatsApp
                        </a>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Botón flotante del carrito */}
      {conCarrito && (
        <button
          onClick={() => setCarritoAbierto(true)}
          className="fixed bottom-5 right-5 z-30 flex items-center gap-2 text-white rounded-full pl-4 pr-5 py-3 shadow-lg hover:opacity-90 transition-opacity"
          style={{ backgroundColor: colorPrimario }}
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            {totalItems > 0 && (
              <span
                className="absolute -top-2 -right-2 text-[10px] font-bold text-white rounded-full w-4 h-4 flex items-center justify-center"
                style={{ backgroundColor: colorSecundario }}
              >
                {totalItems}
              </span>
            )}
          </div>
          <span className="text-sm font-medium">
            {totalItems > 0 ? `${totalItems} en el carrito` : "Carrito"}
          </span>
        </button>
      )}

      {/* Panel del carrito */}
      {carritoAbierto && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setCarritoAbierto(false)}
          />
          <div className="relative w-full sm:w-96 h-full bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" /> Tu pedido
              </h2>
              <button onClick={() => setCarritoAbierto(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {itemsCarrito.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  Aún no has agregado productos.
                </p>
              ) : (
                itemsCarrito.map((item) => (
                  <div
                    key={item.producto.id}
                    className="flex items-center gap-3 border-b pb-3"
                  >
                    <img
                      src={item.producto.imagenUrl || "/placeholder-product.png"}
                      alt={item.producto.nombre}
                      className="w-12 h-12 object-contain rounded border flex-shrink-0"
                      style={{ backgroundColor: colorMarcoImagenes }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">
                        {item.producto.nombre}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() =>
                            cambiarCantidad(item.producto.id, -1, item.producto.stock)
                          }
                          className="p-1 border rounded hover:bg-slate-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={item.producto.stock ?? undefined}
                          value={item.cantidad}
                          onChange={(e) =>
                            fijarCantidad(
                              item.producto.id,
                              e.target.valueAsNumber,
                              item.producto.stock,
                            )
                          }
                          onFocus={(e) => e.target.select()}
                          className="w-10 text-xs text-center border-0 focus:outline-none focus:ring-0 bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          onClick={() =>
                            cambiarCantidad(item.producto.id, 1, item.producto.stock)
                          }
                          className="p-1 border rounded hover:bg-slate-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => quitarDelCarrito(item.producto.id)}
                      className="text-slate-400 hover:text-red-500 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {itemsCarrito.length > 0 && (
              <div className="border-t p-4 space-y-3">
                <input
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  placeholder="Tu nombre o negocio (opcional)"
                  maxLength={80}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm"
                />
                {totalCarrito !== null && (
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span style={{ color: colorPrimario }}>
                      {formatValue(totalCarrito)}
                    </span>
                  </div>
                )}
                <button
                  onClick={enviarCarritoPorWhatsapp}
                  disabled={!config.whatsappContacto}
                  className="w-full flex items-center justify-center gap-2 text-white rounded-md py-2.5 font-medium disabled:opacity-40"
                  style={{ backgroundColor: colorSecundario }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Enviar pedido por WhatsApp
                </button>
                {!config.whatsappContacto && (
                  <p className="text-xs text-red-500 text-center">
                    Este catálogo no tiene un WhatsApp de contacto configurado.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
