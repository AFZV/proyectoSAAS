"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  User,
  Search,
  ShoppingCart,
  FileText,
  CheckCircle,
  AlertCircle,
  Package,
  WifiOff,
  Wifi,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { formatValue } from "@/utils/FormartValue";
import { catalogService } from "../../services/catalog.services";
import type { CarritoItem, Cliente } from "../../types/catalog.types";

interface ClienteSearchProps {
  onClienteSeleccionado: (cliente: Cliente) => void;
  clienteSeleccionado: Cliente | null;
  onLimpiarCliente: () => void;
}

function ClienteSearch({
  onClienteSeleccionado,
  clienteSeleccionado,
  onLimpiarCliente,
  endpointAll = `${process.env.NEXT_PUBLIC_API_URL}/clientes/all-min`, // <- trae TODOS
}: ClienteSearchProps & { endpointAll?: string }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputTriggerRef = useRef<HTMLInputElement>(null);

  const { getToken } = useAuth();
  const { toast } = useToast();

  // utils locales
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

  // Cargar TODOS los clientes una sola vez
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const token = await getToken();
        if (!token) throw new Error("No se pudo obtener el token");

        const res = await fetch(endpointAll, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("No se pudo cargar la lista de clientes");

        const data: Cliente[] = await res.json();
        if (mounted) setClientes(Array.isArray(data) ? data : []);
      } catch (err: any) {
        toast({
          title: "Error",
          description: err?.message || "Fallo cargando clientes",
          variant: "destructive",
          duration: 1200,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [endpointAll, getToken, toast]);

  // Filtrado en frontend por nombre/apellidos/razón social o NIT
  const filtered = React.useMemo(() => {
    const q = query.trim();
    if (!q) return clientes; // mostrar todos si no hay query
    const qDigits = onlyDigits(q);
    const isNit = qDigits.length > 0;

    const byName = (c: Cliente) => {
      const full = `${c.rasonZocial || ""} ${c.nombre || ""} ${
        c.apellidos || ""
      }`.trim();
      return normalize(full).includes(normalize(q));
    };
    const byNit = (c: Cliente) => onlyDigits(c.nit || "").includes(qDigits);

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

  const handleSelect = (c: Cliente) => {
    onClienteSeleccionado(c);
    setQuery(c.rasonZocial || `${c.nombre || ""} ${c.apellidos || ""}`.trim());
    setOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
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
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  // Si ya hay cliente seleccionado, mantenemos tu UI de “Cliente Seleccionado”
  if (clienteSeleccionado) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Cliente Seleccionado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="font-medium text-lg">
                    {clienteSeleccionado.rasonZocial ||
                      `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellidos}`}
                  </h4>
                  {clienteSeleccionado.nit && (
                    <p className="text-sm text-muted-foreground">
                      NIT: {clienteSeleccionado.nit}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>📍 {clienteSeleccionado.ciudad}</span>
                    <span>📞 {clienteSeleccionado.telefono}</span>
                    {clienteSeleccionado.email && (
                      <span>✉️ {clienteSeleccionado.email}</span>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={onLimpiarCliente}>
                  Cambiar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Selector con modal grande (anidado dentro del Dialog del checkout)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Buscar Cliente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Trigger: input solo lectura que abre el modal */}
          <div>
            <Label htmlFor="cliente">Cliente</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="cliente"
                ref={inputTriggerRef}
                value={query}
                readOnly
                placeholder="Click para seleccionar (buscar por nombre o NIT)"
                onClick={() => setOpen(true)}
                className="cursor-pointer"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(true)}
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Se cargan todos los clientes y puedes filtrar en tiempo real.
            </p>
          </div>

          {/* Modal selector */}
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v)
                requestAnimationFrame(() => inputTriggerRef.current?.blur());
            }}
          >
            <DialogContent className="max-w-4xl w-[90vw] max-h-[80vh] p-0 overflow-hidden">
              <DialogHeader className="px-6 pt-6 pb-2">
                <DialogTitle>Seleccionar cliente</DialogTitle>
              </DialogHeader>

              {/* Buscador dentro del modal */}
              <div className="px-6 pb-3">
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(-1);
                  }}
                  onKeyDown={onKeyDown}
                  placeholder="Escribe nombre/apellidos o NIT…"
                />
              </div>

              {/* Lista */}
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
                          NIT: {highlight(c.nit || "", onlyDigits(query))}
                        </div>
                      </button>
                    );
                  })}
              </div>

              <div className="px-6 py-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  {filtered.length} resultados {query ? "filtrados" : "totales"}
                </div>
                <div>
                  ↑/↓ para navegar • Enter para seleccionar • Esc para cerrar
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

interface CheckoutModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  carrito: CarritoItem[];
  onPedidoCreado: () => void;
  initialNotes?: string;
  onNotesChange?: (texto: string) => void;
  userType?: string; // Rol del usuario (CLIENTE, admin, vendedor, etc.)
  clienteId?: string | null; // ID del cliente si el usuario es CLIENTE
  tipoPrecio: "mayor" | "mostrador";
  getPrecioConTipo: (precio: number) => number;
}

export function CheckoutModal({
  isOpen,
  onOpenChange,
  carrito,
  onPedidoCreado,
  initialNotes,
  onNotesChange,
  userType,
  clienteId,
  tipoPrecio,
  getPrecioConTipo,
}: CheckoutModalProps) {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nitOffline, setNitOffline] = useState("");

  const [notes, setNotes] = useState("");
  const prevOpenRef = React.useRef(false);

  useEffect(() => {
    // Solo cargar initialNotes cuando el modal se ABRE (flanco false -> true)
    if (isOpen && !prevOpenRef.current) {
      setNotes(initialNotes ?? "");
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, initialNotes]);

  const { getToken } = useAuth();
  const { toast } = useToast();

  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  // ✅ Sincronizar pedidos pendientes al volver online
  useEffect(() => {
    if (!isOnline) return;

    const syncPedidosPendientes = async () => {
      const pendientes: any[] = JSON.parse(
        localStorage.getItem("pedidosPendientes") || "[]"
      );
      if (pendientes.length === 0) return;

      const token = await getToken();
      if (!token) return;

      const requeue: any[] = [];
      let enviados = 0;

      for (const pedido of pendientes) {
        try {
          let clienteId = pedido.clienteId;

          if (!clienteId && pedido.nitOffline) {
            // Buscar cliente por NIT al reconectar
            const cliente = await catalogService.buscarClientePorNit(
              token,
              pedido.nitOffline
            );
            clienteId = cliente.id;
          }

          await catalogService.crearPedidoDesdeCarrito(
            token,
            clienteId,
            pedido.productos,
            pedido.observaciones
          );

          enviados++;
        } catch (err) {
          // Sube contador de reintentos y reencola
          pedido.retries = (pedido.retries || 0) + 1;
          requeue.push(pedido);
        }
      }

      if (requeue.length > 0) {
        localStorage.setItem("pedidosPendientes", JSON.stringify(requeue));
      } else {
        localStorage.removeItem("pedidosPendientes");
      }

      toast({
        title: "Sincronización completa",
        description: `${enviados} pedidos enviados correctamente`,
        duration: 1000,
      });
    };

    syncPedidosPendientes();
  }, [isOnline]);

  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const totalPrecio = React.useMemo(
    () =>
      carrito.reduce(
        (sum, item) => sum + getPrecioConTipo(item.precio) * item.cantidad,
        0
      ),
    [carrito, getPrecioConTipo]
  );
  const handleClienteSeleccionado = (clienteData: Cliente) => {
    setCliente(clienteData);
  };

  const limpiarCliente = () => setCliente(null);

  const finalizarPedido = async () => {
    // ✅ Si es CLIENTE, usar su clienteId directamente
    const esCliente = userType === "CLIENTE";
    const clienteIdFinal = esCliente ? clienteId : cliente?.id;

    if (!isOnline) {
      const pedidoOffline = {
        idLocal:
          (crypto as any)?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        clienteId: clienteIdFinal || null,
        nitOffline: nitOffline.trim(),
        productos: carrito.map((item) => ({
          id: item.id,
          cantidad: item.cantidad,
          precio: getPrecioConTipo(item.precio),
        })),
        observaciones: notes,
        total: totalPrecio,
        fecha: new Date().toISOString(),
        retries: 0,
      };

      const pendientes = JSON.parse(
        localStorage.getItem("pedidosPendientes") || "[]"
      );
      pendientes.push(pedidoOffline);
      localStorage.setItem("pedidosPendientes", JSON.stringify(pendientes));

      toast({
        title: "Pedido guardado offline",
        description: "Se enviará automáticamente cuando vuelva la conexión",
        duration: 1000,
      });

      limpiarFormulario();
      return;
    }

    if (!isOnline && !nitOffline.trim()) {
      toast({
        title: "Error",
        description: "Debe ingresar un NIT para modo offline",
        variant: "destructive",
        duration: 1000,
      });
      return;
    }

    if (carrito.length === 0) {
      toast({
        title: "Error",
        description: "El carrito está vacío",
        variant: "destructive",
        duration: 1000,
      });
      return;
    }

    // ✅ Validar que haya clienteId (ya sea del cliente autenticado o seleccionado)
    if (!clienteIdFinal) {
      toast({
        title: "Error",
        description: esCliente
          ? "No se pudo identificar tu cuenta de cliente"
          : "Debes seleccionar un cliente",
        variant: "destructive",
        duration: 1000,
      });
      return;
    }

    const pedidoData = {
      nitOffline: isOnline ? null : nitOffline.trim(),
      clienteId: clienteIdFinal,
      productos: carrito.map((item) => ({
        id: item.id,
        cantidad: item.cantidad,
        precio: getPrecioConTipo(item.precio),
      })),
      observaciones: notes,
      total: totalPrecio,
      fecha: new Date().toISOString(),
    };

    if (!isOnline) {
      const pendientes = JSON.parse(
        localStorage.getItem("pedidosPendientes") || "[]"
      );
      pendientes.push(pedidoData);
      localStorage.setItem("pedidosPendientes", JSON.stringify(pendientes));

      toast({
        title: "Pedido guardado offline",
        description: "Se enviará automáticamente cuando vuelva la conexión",
        duration: 1000,
      });

      limpiarFormulario();
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await getToken();
      if (!token) throw new Error("No se pudo obtener token");

      await catalogService.crearPedidoDesdeCarrito(
        token,
        clienteIdFinal,
        pedidoData.productos,
        pedidoData.observaciones
      );

      toast({
        title: "¡Pedido creado!",
        description: `Pedido por ${formatValue(
          totalPrecio
        )} registrado correctamente`,
        duration: 1000,
      });

      limpiarFormulario();
    } catch (error: any) {
      toast({
        title: "Error al crear pedido",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const limpiarFormulario = () => {
    setCliente(null);
    setObservaciones("");
    setNitOffline("");
    onPedidoCreado();
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setCliente(null);
      setObservaciones("");
      setNitOffline("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Finalizar Pedido
            <span
              className={`flex items-center gap-2 text-sm ml-auto ${
                isOnline ? "text-green-600" : "text-red-600"
              }`}
            >
              {isOnline ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              {isOnline ? "Conectado" : "Sin conexión"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Columna izquierda */}
          <div className="space-y-6">
            {/* ✅ Solo mostrar selector de cliente si NO es CLIENTE */}
            {userType !== "CLIENTE" && (
              <>
                {isOnline ? (
                  <ClienteSearch
                    onClienteSeleccionado={handleClienteSeleccionado}
                    clienteSeleccionado={cliente}
                    onLimpiarCliente={limpiarCliente}
                  />
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Cliente Offline
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Label>NIT del Cliente</Label>
                      <Input
                        placeholder="Ingrese NIT"
                        value={nitOffline}
                        onChange={(e) =>
                          setNitOffline(e.target.value.replace(/\D/g, ""))
                        }
                        maxLength={20}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Este NIT será validado al reconectarse
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Observaciones */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-muted-foreground">
                Observaciones del pedido
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-32 rounded-lg border border-input bg-background p-3 text-sm 
             focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Agrega instrucciones adicionales para el pedido..."
              />

              <p className="text-xs text-muted-foreground">
                Este campo se envía con el pedido. Ya incluye las observaciones
                por producto si agregaste alguna.
              </p>
            </div>
          </div>

          {/* Columna derecha */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Resumen del Pedido
                  <Badge variant="secondary">{totalItems} items</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {carrito.map((item) => {
                    const precioUnit = getPrecioConTipo(item.precio);
                    const subtotal = precioUnit * item.cantidad;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center space-x-3 p-3 border rounded-lg"
                      >
                        <img
                          src={item.imagenUrl || "/placeholder-product.png"}
                          alt={item.nombre}
                          className="w-12 h-12 object-cover rounded-md"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.nombre}</h4>
                          <p className="text-xs text-muted-foreground">
                            {item.categoria}
                          </p>
                          <div className="flex justify-between mt-1 text-sm">
                            <span>
                              {item.cantidad} × {formatValue(precioUnit)}
                            </span>
                            <span className="font-semibold">
                              {formatValue(subtotal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Separator className="my-4" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-green-600">
                    {formatValue(totalPrecio)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button
                onClick={finalizarPedido}
                disabled={
                  (isOnline && userType !== "CLIENTE" && !cliente) || // Solo validar cliente si NO es CLIENTE
                  carrito.length === 0 ||
                  isSubmitting ||
                  (!isOnline && !nitOffline)
                }
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700"
                size="lg"
              >
                {isSubmitting
                  ? "Creando Pedido..."
                  : `Crear Pedido por ${formatValue(totalPrecio)}`}
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
