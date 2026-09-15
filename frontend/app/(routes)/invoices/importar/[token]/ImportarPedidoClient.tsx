"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShoppingCart,
  Search,
  Minus,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatValue } from "@/utils/FormartValue";
import type { ItemPedidoImportado, ClienteBusqueda } from "./importar.types";

interface ImportarPedidoClientProps {
  itemsIniciales: ItemPedidoImportado[];
  observacionGeneralInicial?: string;
  token: string;
}

// Mismo formato que buildTextoObservacionesCheckout en CatalogClient.tsx (catálogo interno),
// para que un pedido se vea igual sin importar si se armó ahí o por este importador.
function construirObservacionesIniciales(
  items: ItemPedidoImportado[],
  observacionGeneral: string,
): string {
  const lineas = items
    .filter((i) => i.observacion?.trim())
    .map((i) => `• ${i.nombre}: ${i.observacion!.trim()}`);

  const bloqueProductos = lineas.length
    ? `OBSERVACIONES POR PRODUCTO:\n${lineas.join("\n")}`
    : "";
  const bloqueGeneral = observacionGeneral.trim()
    ? `${lineas.length ? "\n\n" : ""}OBSERVACIÓN GENERAL:\n${observacionGeneral.trim()}`
    : "";

  return `${bloqueProductos}${bloqueGeneral}`.trim();
}

export function ImportarPedidoClient({
  itemsIniciales,
  observacionGeneralInicial = "",
  token,
}: ImportarPedidoClientProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState(
    itemsIniciales.filter((i) => i.disponible),
  );
  const itemsNoDisponibles = itemsIniciales.filter((i) => !i.disponible);

  const [observaciones, setObservaciones] = useState(() =>
    construirObservacionesIniciales(itemsIniciales, observacionGeneralInicial),
  );
  const [enviando, setEnviando] = useState(false);
  const [pedidoCreado, setPedidoCreado] = useState(false);
  // Guardado síncrono: `enviando` (estado) solo se refleja en el DOM tras un re-render, y un
  // doble clic muy rápido puede disparar el handler dos veces antes de que eso se pinte. Este
  // ref se lee/escribe al instante, sin esperar a React, y es lo que realmente evita el doble envío.
  const enviandoRef = useRef(false);

  // Búsqueda de cliente (por NIT o por nombre — el backend detecta cuál es)
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [resultados, setResultados] = useState<ClienteBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<ClienteBusqueda | null>(null);

  useEffect(() => {
    const termino = busquedaCliente.trim();
    if (termino.length < 3) {
      setResultados([]);
      return;
    }
    const id = setTimeout(async () => {
      setBuscando(true);
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/clientes/getByFilter/${encodeURIComponent(termino)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setResultados(res.ok ? await res.json() : []);
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 350);
    return () => clearTimeout(id);
  }, [busquedaCliente, getToken]);

  const cambiarCantidad = (productoId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.productoId === productoId
            ? {
                ...i,
                cantidad: Math.max(
                  1,
                  i.stock !== null
                    ? Math.min(i.cantidad + delta, i.stock)
                    : i.cantidad + delta,
                ),
              }
            : i,
        )
        .filter((i) => i.cantidad > 0),
    );
  };

  const quitarItem = (productoId: string) => {
    setItems((prev) => prev.filter((i) => i.productoId !== productoId));
  };

  const total = useMemo(
    () =>
      items.every((i) => i.precio !== null)
        ? items.reduce((acc, i) => acc + (i.precio ?? 0) * i.cantidad, 0)
        : null,
    [items],
  );

  const crearPedido = async () => {
    if (!clienteSeleccionado || items.length === 0) return;
    if (enviandoRef.current || pedidoCreado) return; // bloqueo síncrono, ver comentario arriba
    enviandoRef.current = true;
    setEnviando(true);
    try {
      const authToken = await getToken();
      if (!authToken) throw new Error("No hay token de autorización");

      // Endpoint dedicado: "reclama" el token de importación de forma atómica antes de crear
      // el pedido, así que reintentar con el mismo link ya no puede duplicar el pedido.
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/pedidos/importar/${token}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            clienteId: clienteSeleccionado.id,
            observaciones: observaciones.trim() || undefined,
            productos: items.map((i) => ({
              productoId: i.productoId,
              cantidad: i.cantidad,
              precio: i.precio ?? 0,
            })),
          }),
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "No se pudo crear el pedido");
      }

      toast({ title: "✅ Pedido creado correctamente" });
      // Se marca como creado (y NO se reactiva enviandoRef) para que la pantalla quede
      // bloqueada mientras se completa la navegación — ya no hay forma de reenviarlo.
      setPedidoCreado(true);
      router.push("/invoices");
    } catch (error: any) {
      toast({
        title: "Error al crear el pedido",
        description: error?.message ?? "Inténtalo de nuevo.",
        variant: "destructive",
      });
      enviandoRef.current = false; // sí se puede reintentar si falló
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-600" />
          Importar pedido del catálogo
        </h1>
        <p className="text-sm text-muted-foreground">
          Revisa las cantidades, elige el cliente y confirma.
        </p>
      </div>

      {itemsNoDisponibles.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-md p-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            {itemsNoDisponibles.length}{" "}
            {itemsNoDisponibles.length === 1
              ? "producto de este pedido ya no está disponible"
              : "productos de este pedido ya no están disponibles"}{" "}
            (se eliminó o desactivó) y no se incluirán.
          </span>
        </div>
      )}

      {/* Items */}
      <div className="border rounded-lg divide-y">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            No quedan productos disponibles para importar.
          </p>
        ) : (
          items.map((item) => (
            <div key={item.productoId} className="flex items-center gap-3 p-3">
              <img
                src={item.imagenUrl || "/placeholder-product.png"}
                alt={item.nombre ?? ""}
                className="w-12 h-12 object-contain rounded border bg-slate-50 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">
                  {item.nombre}
                </p>
                {item.precio !== null && (
                  <p className="text-xs text-muted-foreground">
                    {formatValue(item.precio)} c/u
                    {item.stock !== null && ` · Stock: ${item.stock}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 border rounded-md">
                <button
                  onClick={() => cambiarCantidad(item.productoId, -1)}
                  className="p-1.5 hover:bg-slate-100"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={item.stock ?? undefined}
                  value={item.cantidad}
                  onChange={(e) => {
                    const v = e.target.valueAsNumber;
                    setItems((prev) =>
                      prev.map((i) =>
                        i.productoId === item.productoId
                          ? {
                              ...i,
                              cantidad: Number.isFinite(v)
                                ? Math.max(
                                    0,
                                    i.stock !== null
                                      ? Math.min(v, i.stock)
                                      : v,
                                  )
                                : 0,
                            }
                          : i,
                      ),
                    );
                  }}
                  className="w-10 text-sm text-center border-0 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() => cambiarCantidad(item.productoId, 1)}
                  disabled={item.stock !== null && item.cantidad >= item.stock}
                  className="p-1.5 hover:bg-slate-100 disabled:opacity-30"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={() => quitarItem(item.productoId)}
                className="text-slate-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {total !== null && items.length > 0 && (
        <div className="flex justify-between font-semibold text-lg px-1">
          <span>Total</span>
          <span className="text-blue-600">{formatValue(total)}</span>
        </div>
      )}

      {/* Cliente */}
      <div className="space-y-2">
        <Label>Cliente</Label>
        {clienteSeleccionado ? (
          <div className="flex items-center justify-between border rounded-md p-3 bg-blue-50 border-blue-200">
            <div>
              <p className="text-sm font-medium">
                {clienteSeleccionado.rasonZocial ||
                  `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellidos ?? ""}`}
              </p>
              <p className="text-xs text-muted-foreground">
                NIT: {clienteSeleccionado.nit}
              </p>
            </div>
            <button onClick={() => setClienteSeleccionado(null)}>
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={busquedaCliente}
              onChange={(e) => setBusquedaCliente(e.target.value)}
              placeholder="Buscar por nombre, razón social o NIT..."
              className="pl-9"
            />
            {buscando && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
            )}
            {resultados.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-64 overflow-y-auto">
                {resultados.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setClienteSeleccionado(c);
                      setBusquedaCliente("");
                      setResultados([]);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex items-center justify-between"
                  >
                    <span>
                      {c.rasonZocial || `${c.nombre} ${c.apellidos ?? ""}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {c.nit}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Observaciones */}
      <div className="space-y-2">
        <Label>Observaciones (opcional)</Label>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          className="w-full min-h-20 rounded-md border border-input bg-background p-3 text-sm"
          placeholder="Ej: entregar en la tarde, confirmar con el cliente antes de despachar..."
        />
      </div>

      <Button
        onClick={crearPedido}
        disabled={
          !clienteSeleccionado ||
          items.length === 0 ||
          enviando ||
          pedidoCreado
        }
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {enviando || pedidoCreado ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <CheckCircle2 className="w-4 h-4 mr-2" />
        )}
        {pedidoCreado ? "Pedido creado" : "Crear pedido"}
      </Button>
    </div>
  );
}
