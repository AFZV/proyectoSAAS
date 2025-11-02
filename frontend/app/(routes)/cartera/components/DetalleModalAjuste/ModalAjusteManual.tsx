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
import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loading } from "@/components/Loading";
import { useAuth } from "@clerk/nextjs";

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
  //token,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  cliente: { id: string; nombre: string };
  //token: string;
  onSuccess?: () => void;
}) {
  const [pedidos, setPedidos] = useState<PedidoConSaldoPendiente[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const { getToken } = useAuth();
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
      const token = await getToken();
      if (!token) return;
      try {
        setLoading(true);
        if (!open || !cliente?.id) return;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/recibos/PedidosSaldoPendiente/${cliente.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-cache",
          }
        );

        if (!response.ok) throw new Error("El cliente no presenta deuda");

        const pedidosResponse = await response.json();

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
  }, [open, cliente?.id]);

  const agregarPedido = (pedido: any) => {
    if (fields.find((f) => f.pedidoId === pedido.id)) return;
    append({ pedidoId: pedido.id, valorAplicado: pedido.saldoPendiente });
  };

  // Reemplaza tu onSubmit para usar token fresco + reintento 401
  const onSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      const body = {
        clienteId: cliente.id,
        observacion: values.observacion,
        pedidos: values.pedidos,
      };

      let freshToken = await getToken();
      if (!freshToken) throw new Error("No se pudo obtener token");

      const doPost = async () => {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/balance/ajusteManual/ajuste`, // <-- ruta correcta
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${freshToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );
        if (res.status === 401) {
          freshToken = await getToken();
          if (!freshToken) throw new Error("Sesión expirada (401)");
          return fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/balance/ajusteManual/ajuste`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${freshToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
            }
          );
        }
        return res;
      };

      const resp = await doPost();
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || "No fue posible crear el ajuste");
      }

      onSuccess?.();
      onClose();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "No fue posible crear el ajuste");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔹 Total reactivo basado en el valor seleccionado (watch)
  const watchedPedidos = form.watch("pedidos");
  const totalSeleccionado = useMemo(() => {
    return (watchedPedidos || []).reduce(
      (acc: number, p: { valorAplicado?: number }) =>
        acc + (Number(p?.valorAplicado ?? 0) || 0),
      0
    );
  }, [watchedPedidos]);

  if (isSubmitting) return <Loading title="Creando ajuste" />;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-blue-800">
            Ajuste manual
            <span className="block text-sm font-normal text-blue-700/80">
              Cliente:{" "}
              <span className="text-blue-900 font-medium">
                {cliente.nombre}
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Observación */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-800">
              Observación
            </label>
            <Input
              {...form.register("observacion")}
              placeholder="Concepto del ajuste"
              className="h-10 border-blue-200 focus-visible:ring-blue-500"
            />
            <p className="text-xs text-blue-700/70">
              Describe brevemente el motivo del ajuste (mínimo 3 caracteres).
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pedidos con saldo */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/40">
              <div className="px-4 py-3 border-b border-blue-200 bg-blue-50">
                <h3 className="text-sm font-semibold text-blue-900">
                  Pedidos con saldo
                </h3>
              </div>

              <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
                {loading ? (
                  <div className="text-sm text-blue-700/80">
                    Cargando pedidos...
                  </div>
                ) : pedidos.length === 0 ? (
                  <div className="text-sm text-blue-700/80">
                    No hay pedidos con saldo pendiente.
                  </div>
                ) : (
                  pedidos.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-md border border-blue-200 bg-white px-3 py-2 hover:bg-blue-50 transition-colors"
                    >
                      <div className="text-sm">
                        <p className="font-medium text-blue-900">
                          Pedido #{p.id.toString().slice(0, 5)}
                        </p>
                        <p className="text-xs text-blue-700/70">
                          Saldo: ${p.saldoPendiente.toLocaleString()}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => agregarPedido(p)}
                        className="shrink-0 bg-blue-600 hover:bg-blue-700"
                      >
                        Seleccionar
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Ajustes seleccionados */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/40">
              <div className="px-4 py-3 border-b border-blue-200 bg-blue-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-blue-900">
                  Ajustes seleccionados
                </h3>
                <div className="text-sm">
                  <span className="text-blue-700/80 mr-1">Total:</span>
                  <span className="font-semibold text-blue-900">
                    ${totalSeleccionado.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
                {fields.length === 0 ? (
                  <div className="text-sm text-blue-700/80">
                    No has seleccionado pedidos aún.
                  </div>
                ) : (
                  fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="rounded-md border border-blue-200 bg-white p-3"
                    >
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-7">
                          <label className="text-xs text-blue-700/80">
                            ID del pedido
                          </label>

                          {/* 👇 Mostrar solo slice(0,5) sin afectar el valor real */}
                          <Input
                            value={`#${
                              (field as any).pedidoId?.toString().slice(0, 5) ??
                              ""
                            }`}
                            disabled
                            className="h-9 border-blue-200 text-blue-900"
                          />
                          {/* Valor real para el form (oculto) */}
                          <input
                            type="hidden"
                            {...form.register(`pedidos.${index}.pedidoId`)}
                          />
                        </div>

                        <div className="col-span-5 flex justify-end">
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => remove(index)}
                            className="h-9"
                          >
                            Quitar
                          </Button>
                        </div>
                        <div className="col-span-5">
                          <label className="text-xs text-blue-700/80">
                            Valor aplicado
                          </label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="$ 0"
                            className="h-9 border-blue-200 focus-visible:ring-blue-500"
                            {...form.register(
                              `pedidos.${index}.valorAplicado`,
                              {
                                setValueAs: (v) => {
                                  // limpia cualquier cosa que no sea dígito
                                  const raw = String(v).replace(/\D/g, "");
                                  return raw ? parseInt(raw, 10) : 0;
                                },
                              }
                            )}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, "");
                              const n = raw ? parseInt(raw, 10) : 0;

                              // actualizar form con el valor crudo
                              form.setValue(
                                `pedidos.${index}.valorAplicado`,
                                n,
                                { shouldValidate: true }
                              );

                              // mostrar formateado en el input
                              e.target.value = n
                                ? `$ ${n.toLocaleString("es-CO")}`
                                : "";
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Guardar ajuste
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
