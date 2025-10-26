"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RefreshCw, Edit3, Plus, X, ShoppingCart } from "lucide-react";
import { Loading } from "@/components/Loading";

const searchSchema = z.object({
  idRecibo: z.string().uuid("ID inválido"),
});

const formSchema = z.object({
  clienteId: z.string().uuid(),
  tipo: z.enum(["efectivo", "consignacion"]),
  concepto: z.string().min(3),
  pedidos: z
    .array(
      z.object({
        pedidoId: z.string().uuid(),
        valorAplicado: z.number().positive(),
      })
    )
    .min(1),
});

type ReciboEditable = z.infer<typeof formSchema>;
type PedidoPendiente = {
  id: string;
  saldoPendiente: number;
  fecha: string;
  valorOriginal: number;
};

export function FormUpdateRecibo({
  setOpenModalUpdate,
}: {
  setOpenModalUpdate: (v: boolean) => void;
}) {
  const [step, setStep] = useState<"search" | "edit">("search");
  const [reciboActual, setReciboActual] = useState<ReciboEditable | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pedidosDisponibles, setPedidosDisponibles] = useState<
    PedidoPendiente[]
  >([]);
  const [mostrarPedidos, setMostrarPedidos] = useState(false);

  const { getToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const searchForm = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
  });

  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: editForm.control,
    name: "pedidos",
  });

  const onSearch = async (values: z.infer<typeof searchSchema>) => {
    setIsSearching(true);
    try {
      const token = await getToken();
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/recibos/getById/${values.idRecibo}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = res.data;

      const reciboEditable: ReciboEditable = {
        clienteId: data.clienteId,
        tipo: String(data.tipo).toLowerCase() as ReciboEditable["tipo"],
        concepto: data.concepto,
        pedidos: data.detalleRecibo.map((d: any) => ({
          pedidoId: d.idPedido,
          valorAplicado: Number(d.valorTotal),
        })),
      };

      editForm.reset(reciboEditable);
      setReciboActual(reciboEditable);
      editForm.reset(reciboEditable);
      setStep("edit");
      toast({ title: "Recibo encontrado", duration: 1500 });

      // Cargar pedidos pendientes del cliente
      const pendientes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/recibos/PedidosSaldoPendiente/${data.clienteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPedidosDisponibles(pendientes.data);
    } catch (error) {
      toast({ title: "Recibo no encontrado", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const onUpdate = async (values: z.infer<typeof formSchema>) => {
    if (!searchForm.getValues("idRecibo")) return;
    setIsUpdating(true);
    try {
      const token = await getToken();

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/recibos/${searchForm.getValues(
          "idRecibo"
        )}`,
        values,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: "Recibo actualizado correctamente" });
      setOpenModalUpdate(false);
      router.refresh();
    } catch (error) {
      toast({ title: "Error al actualizar recibo", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const volverABuscar = () => {
    setStep("search");
    setReciboActual(null);
    searchForm.reset();
    editForm.reset();
  };

  if (isUpdating) return <Loading title="Actualizando recibo..." />;

  return (
    <div className="space-y-6">
      {step === "search" ? (
        <Form {...searchForm}>
          <form
            onSubmit={searchForm.handleSubmit(onSearch)}
            className="space-y-4"
          >
            <FormField
              control={searchForm.control}
              name="idRecibo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID del Recibo</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="UUID del recibo" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isSearching}
              className={`
    w-full
    bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700
    hover:from-blue-600 hover:to-blue-800
    text-white font-semibold
    shadow-md hover:shadow-lg
    disabled:opacity-50 disabled:pointer-events-none
    transition-all duration-200
  `}
            >
              {isSearching ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Buscar Recibo
                </>
              )}
            </Button>
          </form>
        </Form>
      ) : (
        <Form {...editForm}>
          <form
            onSubmit={editForm.handleSubmit(onUpdate)}
            className="space-y-4"
          >
            <FormField
              control={editForm.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Pago</FormLabel>
                  <FormControl>
                    <select
                      className="w-full border p-2 rounded-md"
                      name={field.name}
                      ref={field.ref}
                      value={field.value ?? ""} // asegura que siempre haya value
                      onBlur={field.onBlur}
                      onChange={(e) => {
                        const v = e.target.value as ReciboEditable["tipo"];
                        // fuerza a RHF a registrar el cambio
                        editForm.setValue("tipo", v, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });
                      }}
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="consignacion">Consignación</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={editForm.control}
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

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-3 gap-4 items-end">
                <FormField
                  control={editForm.control}
                  name={`pedidos.${index}.pedidoId`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID del Pedido</FormLabel>
                      <FormControl>
                        <Input {...field} disabled className="bg-muted" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name={`pedidos.${index}.valorAplicado`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Aplicado</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.valueAsNumber || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => remove(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}

            {pedidosDisponibles.length > 0 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMostrarPedidos(!mostrarPedidos)}
                >
                  {mostrarPedidos
                    ? "Ocultar Pedidos Disponibles"
                    : "Ver Otros Pedidos Disponibles"}
                </Button>
                {mostrarPedidos && (
                  <div className="space-y-2 border rounded-md p-3 bg-muted">
                    {pedidosDisponibles.map((p) => (
                      <div
                        key={p.id}
                        className="flex justify-between items-center border p-2 rounded"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            Pedido: #{p.id.slice(0, 6)}
                          </p>
                          <p className="text-sm font-medium">
                            Fecha:
                            {new Date(p.fecha).toLocaleDateString("es-CO")}
                          </p>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Valor Pedido:{" "}
                              {p.valorOriginal.toLocaleString("es-CO")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Saldo: {p.saldoPendiente.toLocaleString("es-CO")}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            const yaExiste = editForm
                              .getValues("pedidos")
                              .some((pd) => pd.pedidoId === p.id);
                            if (!yaExiste) {
                              append({
                                pedidoId: p.id,
                                valorAplicado: p.saldoPendiente,
                              });
                            }
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" /> Usar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={volverABuscar}>
                Buscar Otro
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Actualizar Recibo
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
