"use client";

import React, { useState } from "react";
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

// Componente para buscar cliente - CORREGIDO
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
      });
      return;
    }

    try {
      setIsSearching(true);

      console.log("🔍 Iniciando búsqueda de cliente con NIT:", nitBusqueda);

      // 🔥 OBTENER TOKEN PRIMERO
      const token = await getToken();

      if (!token) {
        throw new Error("No se pudo obtener el token de autenticación");
      }

      console.log("🔑 Token obtenido correctamente");

      // 🎯 USAR EL MÉTODO CORREGIDO CON TOKEN
      const cliente = await catalogService.buscarClientePorNit(
        token,
        nitBusqueda
      );

      console.log("✅ Cliente encontrado:", cliente);

      onClienteSeleccionado(cliente);

      toast({
        title: "Cliente encontrado",
        description: `${cliente.nombre} ${cliente.apellidos}`,
      });

      // Limpiar campo de búsqueda
      setNitBusqueda("");
    } catch (error: any) {
      console.error("❌ Error al buscar cliente:", error);
      toast({
        title: "Cliente no encontrado",
        description: error.message || "No existe un cliente con ese NIT",
        variant: "destructive",
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
                  {clienteSeleccionado.direccion && (
                    <p className="text-sm text-muted-foreground">
                      📍 {clienteSeleccionado.direccion}
                    </p>
                  )}
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
                placeholder="Ingrese el NIT (solo números)"
                value={nitBusqueda}
                onChange={(e) => {
                  // Solo permitir números
                  const value = e.target.value.replace(/\D/g, "");
                  setNitBusqueda(value);
                }}
                onKeyPress={handleKeyPress}
                disabled={isSearching}
                maxLength={20}
              />
              <Button
                onClick={buscarCliente}
                disabled={isSearching || !nitBusqueda.trim()}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
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

  const { getToken } = useAuth();
  const { toast } = useToast();

  // Cálculos del pedido
  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const totalPrecio = carrito.reduce(
    (sum, item) => sum + item.precio * item.cantidad,
    0
  );

  const handleClienteSeleccionado = (clienteData: Cliente) => {
    console.log("👤 Cliente seleccionado:", clienteData);
    setCliente(clienteData);
  };

  const limpiarCliente = () => {
    setCliente(null);
  };

  const finalizarPedido = async () => {
    if (!cliente) {
      toast({
        title: "Error",
        description: "Debe seleccionar un cliente",
        variant: "destructive",
      });
      return;
    }

    if (carrito.length === 0) {
      toast({
        title: "Error",
        description: "El carrito está vacío",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      console.log("🛒 Iniciando creación de pedido...");

      const token = await getToken();

      if (!token) {
        throw new Error("No se pudo obtener el token de autenticación");
      }

      console.log("📋 Datos del pedido:", {
        clienteId: cliente.id,
        items: carrito.length,
        total: totalPrecio,
        observaciones,
      });

      await catalogService.crearPedidoDesdeCarrito(
        token,
        cliente.id,
        carrito.map((item) => ({
          id: item.id,
          cantidad: item.cantidad,
          precio: item.precio,
        })),
        observaciones
      );

      console.log("✅ Pedido creado exitosamente");

      toast({
        title: "¡Pedido creado exitosamente!",
        description: `Pedido por ${formatValue(totalPrecio)} registrado correctamente`,
      });

      // Limpiar estados y cerrar modal
      setCliente(null);
      setObservaciones("");
      onPedidoCreado();
    } catch (error: any) {
      console.error("❌ Error al crear pedido:", error);
      toast({
        title: "Error al crear pedido",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      // Limpiar estados al cerrar
      setCliente(null);
      setObservaciones("");
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
          </DialogTitle>
        </DialogHeader>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Columna izquierda: Cliente y observaciones */}
          <div className="space-y-6">
            {/* Buscar/Mostrar cliente */}
            <ClienteSearch
              onClienteSeleccionado={handleClienteSeleccionado}
              clienteSeleccionado={cliente}
              onLimpiarCliente={limpiarCliente}
            />

            {/* Observaciones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Observaciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="observaciones">
                    Notas del Pedido (Opcional)
                  </Label>
                  <textarea
                    id="observaciones"
                    placeholder="Instrucciones especiales, notas de entrega, etc."
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="mt-1 min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    maxLength={500}
                  />
                  <div className="mt-1 text-xs text-muted-foreground text-right">
                    {observaciones.length}/500 caracteres
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Columna derecha: Resumen del pedido */}
          <div className="space-y-6">
            {/* Resumen de productos */}
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
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2">
                          {item.nombre}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {item.categoria}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm">
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

                {/* Totales */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal ({totalItems} items):</span>
                    <span>{formatValue(totalPrecio)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-green-600">
                      {formatValue(totalPrecio)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botones de acción */}
            <div className="space-y-3">
              <Button
                onClick={finalizarPedido}
                disabled={!cliente || carrito.length === 0 || isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Creando Pedido...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Crear Pedido por {formatValue(totalPrecio)}
                  </>
                )}
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

            {/* Información adicional */}
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>• El pedido será registrado y enviado para procesamiento</p>
              <p>• Recibirás confirmación una vez procesado el pedido</p>
              <p>• Puedes revisar el estado en la sección de pedidos</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
