"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/nextjs";
import { FormCrearReciboProps } from "./FormCrearRecibo.types";
import { Loading } from "@/components/Loading";

const formSchema = z.object({
  nit: z.string().min(5),
  tipo: z.enum(["efectivo", "consignacion"]),
  id: z.string().optional(),
  concepto: z.string().min(3),
  pedidos: z
    .array(
      z.object({
        pedidoId: z.string(),
        valorAplicado: z.number().positive(),
      })
    )
    .optional(),
});

type PedidoConSaldo = {
  id: string;
  fecha: string;
  saldoPendiente: number;
  valorOriginal: number;
};

export function FormCrearRecibo({
  setOpenModalCreate,
  onSuccess,
}: FormCrearReciboProps) {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pedidosDisponibles, setPedidosDisponibles] = useState<
    PedidoConSaldo[]
  >([]);
  const [token, setToken] = useState("");
  const [clienteInfo, setClienteInfo] = useState<{
    id: string;
    nombre: string;
    email: string;
    ciudad: string;
    telefono: string;
  } | null>(null);
  const [loadingCliente, setLoadingCliente] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nit: "",
      id: "",
      tipo: "efectivo",
      concepto: "",
      pedidos: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "pedidos",
  });

  useEffect(() => {
    const fetchToken = async () => {
      const t = await getToken();
      if (t) setToken(t);
    };
    fetchToken();
  }, [getToken]);

  const buscarClientePorNIT = async () => {
    const nit = form.getValues("nit");
    if (!nit || !token) return;

    setLoadingCliente(true);

    // Limpiar estado anterior
    setClienteInfo(null);
    setPedidosDisponibles([]);
    remove(); // limpia pedidos seleccionados

    // Aseguramos reset del clienteId antes de nueva búsqueda
    form.setValue("id", "");
    console.log("nit enviado al backend:", nit);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/clientes/getByNit/${nit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error("Cliente no encontrado");

      const data = await res.json();
      form.setValue("id", data.cliente.id);
      const cliente = data.cliente;
      setClienteInfo({
        id: cliente.id,
        nombre: cliente.rasonZocial || `${cliente.nombre} ${cliente.apellidos}`,
        email: cliente.email,
        ciudad: cliente.ciudad,
        telefono: cliente.telefono,
      });

      toast({ title: `Cliente encontrado` });
    } catch (err) {
      toast({ title: "Cliente no encontrado", variant: "destructive" });
    } finally {
      setLoadingCliente(false);
    }
  };

  useEffect(() => {
    if (!clienteInfo?.id) return;
    const clienteId = clienteInfo.id;
    if (!clienteId || !token) return;

    const fetchPedidos = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/recibos/PedidosSaldoPendiente/${clienteId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        setPedidosDisponibles(data);
      } catch (error) {
        console.error("Error cargando pedidos:", error);
        setPedidosDisponibles([]);
      }
    };

    fetchPedidos();
  }, [token, clienteInfo?.id]);

  const handleAgregarPedido = (pedido: PedidoConSaldo) => {
    const yaExiste = form
      .getValues("pedidos")
      ?.some((p) => p.pedidoId === pedido.id);
    if (yaExiste) return;

    append({ pedidoId: pedido.id, valorAplicado: pedido.saldoPendiente });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      const token = await getToken();

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/recibos`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clienteId: values.id,
          tipo: values.tipo,
          concepto: values.concepto,
          pedidos: values.pedidos,
        }),
      });

      if (!res.ok) throw new Error("Error al crear recibo");

      toast({ title: "Recibo creado con éxito" });
      onSuccess?.();
      setOpenModalCreate(false);
    } catch (error) {
      console.error("Error al crear recibo:", error);
      toast({
        title: `Error al crear recibo. Verifica los datos`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {isSubmitting && <Loading title="Enviando Recibo..." />}
      <Form {...form}>
        {isSubmitting && <Loading title="Enviando Recibo..." />}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {loadingCliente && <Loading title="Cargando Cliente" />}
          <FormField
            control={form.control}
            name="nit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>NIT del Cliente</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Input {...field} placeholder="NIT o cédula del cliente" />
                    <Button type="button" onClick={buscarClientePorNIT}>
                      Buscar
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {clienteInfo && (
            <div className="border p-4 rounded-md bg-muted">
              <p className="text-sm font-semibold">{clienteInfo.nombre}</p>
              <p className="text-sm">📧 {clienteInfo.email}</p>
              <p className="text-sm">📍 {clienteInfo.ciudad}</p>
              <p className="text-sm">📞 {clienteInfo.telefono}</p>
            </div>
          )}

          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de pago</FormLabel>
                <FormControl>
                  <select {...field} className="w-full border p-2 rounded-md">
                    <option value="efectivo">Efectivo</option>
                    <option value="consignacion">Consignación</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="concepto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Concepto</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Descripción del recibo" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {pedidosDisponibles.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Pedidos con saldo pendiente:
              </p>
              {pedidosDisponibles.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center border p-2 rounded"
                >
                  <div>
                    <p className="text-sm font-medium">
                      Pedido #{p.id.slice(0, 6)}
                    </p>
                    <p className="text-sm font-medium">
                      Fecha:{new Date(p.fecha).toLocaleDateString("es-CO")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Valor Original:
                      {p.valorOriginal.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Saldo:
                      {p.saldoPendiente.toLocaleString()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleAgregarPedido(p)}
                    variant="secondary"
                    size="sm"
                  >
                    Usar
                  </Button>
                </div>
              ))}
            </div>
          )}

          {fields.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Pedidos a abonar:</p>
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name={`pedidos.${index}.pedidoId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Pedido</FormLabel>
                        <FormControl>
                          <Input {...field} disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`pedidos.${index}.valorAplicado`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor a aplicar</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            onChange={(e) =>
                              field.onChange(e.target.valueAsNumber || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => remove(index)}
                    >
                      Quitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-center">
            <Button type="submit" disabled={isSubmitting}>
              Crear Recibo
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
