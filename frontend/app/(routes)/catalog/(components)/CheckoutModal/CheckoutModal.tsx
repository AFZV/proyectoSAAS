"use client";

import React, { useEffect, useState } from "react";
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
}: ClienteSearchProps) {
  const [nitBusqueda, setNitBusqueda] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { getToken } = useAuth();
  const { toast } = useToast();

  const buscarCliente = async () => {
    if (!nitBusqueda.trim()) {
      toast({
        title: "Error",
        description: "Ingrese un NIT para buscar",
        variant: "destructive",
        duration: 1000,
      });
      return;
    }

    try {
      setIsSearching(true);
      const token = await getToken();
      if (!token)
        throw new Error("No se pudo obtener el token de autenticación");

      const cliente = await catalogService.buscarClientePorNit(
        token,
        nitBusqueda
      );
      onClienteSeleccionado(cliente);

      toast({
        title: "Cliente encontrado",
        description: `${cliente.nombre} ${cliente.apellidos}`,
        duration: 1000,
      });

      setNitBusqueda("");
    } catch (error: any) {
      toast({
        title: "Cliente no encontrado",
        description: error.message || "No existe un cliente con ese NIT",
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      buscarCliente();
    }
  };

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
          <div>
            <Label htmlFor="nit">NIT del Cliente</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="nit"
                placeholder="Ingrese el NIT"
                value={nitBusqueda}
                onChange={(e) =>
                  setNitBusqueda(e.target.value.replace(/\D/g, ""))
                }
                onKeyPress={handleKeyPress}
                disabled={isSearching}
                maxLength={20}
              />
              <Button
                onClick={buscarCliente}
                disabled={isSearching || !nitBusqueda.trim()}
                className="bg-gradient-to-r from-blue-600 to-blue-700"
              >
                {isSearching ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            Ingrese el NIT del cliente para buscar en la base de datos
          </div>
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
}

export function CheckoutModal({
  isOpen,
  onOpenChange,
  carrito,
  onPedidoCreado,
}: CheckoutModalProps) {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nitOffline, setNitOffline] = useState("");

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
      const pendientes = JSON.parse(
        localStorage.getItem("pedidosPendientes") || "[]"
      );

      if (pendientes.length === 0) return;

      const token = await getToken();
      if (!token) return;

      const pedidosNoEnviados: any[] = [];

      for (const pedido of pendientes) {
        try {
          let clienteId = pedido.clienteId;

          if (!clienteId && pedido.nitOffline) {
            try {
              const cliente = await catalogService.buscarClientePorNit(
                token,
                pedido.nitOffline
              );
              clienteId = cliente.id;
            } catch {
              // Si el cliente no existe, dejamos el pedido para reintentar
              pedidosNoEnviados.push(pedido);
              toast({
                title: "Cliente no encontrado",
                description: `NIT ${pedido.nitOffline} no existe. Corrige y reintenta.`,
                variant: "destructive",
                duration: 1000,
              });
              continue;
            }
          }

          await catalogService.crearPedidoDesdeCarrito(
            token,
            clienteId,
            pedido.productos,
            pedido.observaciones
          );
        } catch (err) {
          console.error("Error reenviando pedido:", err);
          pedidosNoEnviados.push(pedido);
        }
      }

      if (pedidosNoEnviados.length > 0) {
        localStorage.setItem(
          "pedidosPendientes",
          JSON.stringify(pedidosNoEnviados)
        );
      } else {
        localStorage.removeItem("pedidosPendientes");
      }

      toast({
        title: "Sincronización completa",
        description: `${
          pendientes.length - pedidosNoEnviados.length
        } pedidos enviados correctamente`,
        duration: 1000,
      });
    };

    syncPedidosPendientes();
  }, [isOnline]);

  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const totalPrecio = carrito.reduce(
    (sum, item) => sum + item.precio * item.cantidad,
    0
  );

  const handleClienteSeleccionado = (clienteData: Cliente) => {
    setCliente(clienteData);
  };

  const limpiarCliente = () => setCliente(null);

  const finalizarPedido = async () => {
    if (isOnline && !cliente) {
      toast({
        title: "Error",
        description: "Debe seleccionar un cliente",
        variant: "destructive",
        duration: 1000,
      });
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

    const pedidoData = {
      nitOffline: isOnline ? null : nitOffline.trim(),
      clienteId: cliente?.id || null,
      productos: carrito.map((item) => ({
        id: item.id,
        cantidad: item.cantidad,
        precio: item.precio,
      })),
      observaciones,
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
        cliente!.id,
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

            {/* Observaciones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Observaciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  placeholder="Notas del pedido (opcional)"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
                  maxLength={500}
                />
                <div className="mt-1 text-xs text-muted-foreground text-right">
                  {observaciones.length}/500 caracteres
                </div>
              </CardContent>
            </Card>
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
                  {carrito.map((item) => (
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
                            {item.cantidad} × {formatValue(item.precio)}
                          </span>
                          <span className="font-semibold">
                            {formatValue(item.precio * item.cantidad)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
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
                  (isOnline && !cliente) ||
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
