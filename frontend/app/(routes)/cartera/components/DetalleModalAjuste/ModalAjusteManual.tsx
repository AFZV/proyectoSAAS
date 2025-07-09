"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loading } from "@/components/Loading";

const schema = z.object({
  observacion: z.string().min(3),
  pedidos: z.array(
    z.object({
      pedidoId: z.string(),
      valorAplicado: z.number().positive(),
    })
  ),
});

interface PedidoConSaldoPendiente {
  id: string;
  saldoPendiente: number;
}
export function ModalAjusteManual({
  open,
  onClose,
  cliente,
  token,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  cliente: { id: string; nombre: string };
  token: string;
  onSuccess?: () => void;
}) {
  const [pedidos, setPedidos] = useState<PedidoConSaldoPendiente[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      observacion: "",
      pedidos: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "pedidos",
  });

  useEffect(() => {
    const cargarPedidos = async () => {
      try {
        setLoading(true);
        if (!open || !cliente?.id) return;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/recibos/PedidosSaldoPendiente/${cliente.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) throw new Error("El cliente no presenta deuda");

        const pedidosResponse = await response.json();

        // Validar que sea un array
        if (Array.isArray(pedidosResponse)) {
          setPedidos(pedidosResponse);
        } else {
          setPedidos([]);
          console.error("Respuesta inválida:", pedidosResponse);
        }
      } catch (error) {
        console.error("Error al cargar pedidos:", error);
        setPedidos([]);
      } finally {
        setLoading(false);
      }
    };

    cargarPedidos();
  }, [open, cliente?.id, token]);

  const agregarPedido = (pedido: any) => {
    if (fields.find((f) => f.pedidoId === pedido.id)) return;
    append({ pedidoId: pedido.id, valorAplicado: pedido.saldoPendiente });
  };

  const onSubmit = async (values: any) => {
    setIsSubmitting(true);
    const total = values.pedidos.reduce(
      (acumulador: number, pedido: { valorAplicado: number }) =>
        acumulador + pedido.valorAplicado,
      0
    );

    const body = {
      clienteId: cliente.id,
      observacion: values.observacion,
      pedidos: values.pedidos,
    };

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/balance/ajusteManual`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    setIsSubmitting(false);

    onSuccess?.();
    onClose();
  };
  if (isSubmitting)
    return (
      <Loading
        title="Crean
  ndo ajuste"
      />
    );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajuste manual - {cliente.nombre}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Input
            {...form.register("observacion")}
            placeholder="Concepto del ajuste"
          />

          {pedidos.map((p: any) => (
            <div key={p.id} className="flex justify-between items-center">
              <div>
                <p className="text-sm">Pedido #{p.id}</p>
                <p className="text-xs text-muted-foreground">
                  Saldo: ${p.saldoPendiente.toLocaleString()}
                </p>
              </div>
              <Button type="button" size="sm" onClick={() => agregarPedido(p)}>
                Agregar
              </Button>
            </div>
          ))}

          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando pedidos...</p>
          ) : (
            fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-end">
                <Input
                  {...form.register(`pedidos.${index}.pedidoId`)}
                  disabled
                />
                <Input
                  type="number"
                  {...form.register(`pedidos.${index}.valorAplicado`, {
                    valueAsNumber: true,
                  })}
                />
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => remove(index)}
                >
                  Quitar
                </Button>
              </div>
            ))
          )}

          <DialogFooter>
            <Button type="submit">Guardar ajuste</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
