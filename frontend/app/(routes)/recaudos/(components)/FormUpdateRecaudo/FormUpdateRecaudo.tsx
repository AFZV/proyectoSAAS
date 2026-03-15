"use client";

import { useRef, useState } from "react";
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

/* SafeFormMessage: evita "Objects are not valid as React child"
   cuando react-hook-form entrega un objeto de error en vez de string */
function SafeFormMessage({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  const text =
    typeof children === "string"
      ? children
      : typeof children === "object" &&
          children !== null &&
          "message" in (children as any)
        ? String((children as any).message)
        : JSON.stringify(children);
  return <p className="text-sm font-medium text-destructive">{text}</p>;
}

/* =======================
 *  Schemas
 * ======================= */
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
        valorAplicado: z.coerce.number().nonnegative().optional(),
        ajuste: z.coerce.number().nonnegative().optional(),
      }),
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

type AjusteItem = { idPedido: string; ajuste: number };

/* =======================
 *  Componente
 * ======================= */
export function FormUpdateRecibo({
  setOpenModalUpdate,
}: {
  setOpenModalUpdate: (v: boolean) => void;
}) {
  const [step, setStep] = useState<"search" | "edit">("search");
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [pedidosDisponibles, setPedidosDisponibles] = useState<
    PedidoPendiente[]
  >([]);
  const [mostrarPedidos, setMostrarPedidos] = useState(false);

  const inicializadoRef = useRef(false);

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

  /* -----------------------
   * Buscar recibo
   * ----------------------- */
  const onSearch = async (values: z.infer<typeof searchSchema>) => {
    setIsSearching(true);
    inicializadoRef.current = false;
    try {
      const token = await getToken();

      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/recibos/getById/${values.idRecibo}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = res.data;

      let ajustesMap: Record<string, number> = {};
      try {
        const aj = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/recibos/ajustesporrecibo/ajustes/${values.idRecibo}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        (aj.data as AjusteItem[]).forEach((a) => {
          ajustesMap[a.idPedido] = Number(a.ajuste ?? 0);
        });
      } catch {
        ajustesMap = {};
      }

      const reciboEditable: ReciboEditable = {
        clienteId: data.clienteId,
        tipo: String(data.tipo).toLowerCase() as ReciboEditable["tipo"],
        concepto: data.concepto,
        pedidos: (data.detalleRecibo || []).map((d: any) => ({
          pedidoId: d.idPedido,
          valorAplicado: Number(d.valorTotal),
          ajuste: ajustesMap[d.idPedido] ?? 0,
        })),
      };

      editForm.reset(reciboEditable);
      setStep("edit");
      toast({ title: "Recibo encontrado", duration: 1500 });

      const pendientes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/recibos/PedidosSaldoPendiente/${data.clienteId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setPedidosDisponibles(pendientes.data || []);

      inicializadoRef.current = true;
    } catch {
      toast({ title: "Recibo no encontrado", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  /* -----------------------
   * Actualizar recibo
   * FIX: usar ?? en lugar de || para que el valor 0 no sea tratado como falsy
   * ----------------------- */
  const onUpdate = async (values: z.infer<typeof formSchema>) => {
    const idRecibo = searchForm.getValues("idRecibo");
    if (!idRecibo) return;
    setIsUpdating(true);
    try {
      const token = await getToken();

      const pedidosPayload = (values.pedidos ?? []).map((p) => ({
        pedidoId: p.pedidoId,
        valorAplicado: p.valorAplicado ?? 0,
        descuento: (p as any).ajuste ?? (p as any).descuento ?? 0,
      }));

      const payload = {
        clienteId: values.clienteId,
        tipo: values.tipo,
        concepto: values.concepto,
        pedidos: pedidosPayload,
      };

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/recibos/actualizar/${idRecibo}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      toast({ title: "Recibo actualizado correctamente" });
      setOpenModalUpdate(false);
      router.refresh();
    } catch (error: any) {
      console.error("Update error:", error?.response?.data || error);
      toast({
        title: "Error al actualizar recibo",
        description:
          error?.response?.data?.message ||
          (typeof error?.response?.data === "string"
            ? error.response.data
            : JSON.stringify(error?.response?.data)) ||
          "Bad Request",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const volverABuscar = () => {
    setStep("search");
    searchForm.reset();
    editForm.reset();
    setPedidosDisponibles([]);
    inicializadoRef.current = false;
  };

  /* -----------------------
   * Render
   * ----------------------- */
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
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>ID del Recibo</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="UUID del recibo" />
                  </FormControl>
                  {fieldState.error && (
                    <p className="text-sm font-medium text-destructive">
                      {typeof fieldState.error.message === "string"
                        ? fieldState.error.message
                        : JSON.stringify(fieldState.error.message)}
                    </p>
                  )}
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isSearching}
              className="
                w-full
                bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700
                hover:from-blue-600 hover:to-blue-800
                text-white font-semibold
                shadow-md hover:shadow-lg
                disabled:opacity-50 disabled:pointer-events-none
                transition-all duration-200
              "
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
            {/* Tipo */}
            <FormField
              control={editForm.control}
              name="tipo"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Tipo de Pago</FormLabel>
                  <FormControl>
                    <select
                      className="w-full border p-2 rounded-md"
                      name={field.name}
                      ref={field.ref}
                      value={field.value ?? ""}
                      onBlur={field.onBlur}
                      onChange={(e) => {
                        editForm.setValue("tipo", e.target.value as any, {
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
                  {fieldState.error && (
                    <p className="text-sm font-medium text-destructive">
                      {typeof fieldState.error.message === "string"
                        ? fieldState.error.message
                        : JSON.stringify(fieldState.error.message)}
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* Concepto */}
            <FormField
              control={editForm.control}
              name="concepto"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Concepto</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Descripción del recibo" />
                  </FormControl>
                  {fieldState.error && (
                    <p className="text-sm font-medium text-destructive">
                      {typeof fieldState.error.message === "string"
                        ? fieldState.error.message
                        : JSON.stringify(fieldState.error.message)}
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* Pedidos */}
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-4 gap-4 items-end border rounded-md p-3"
              >
                {/* Pedido ID */}
                <FormField
                  control={editForm.control}
                  name={`pedidos.${index}.pedidoId`}
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Pedido</FormLabel>
                      <FormControl>
                        <Input {...field} disabled className="bg-muted" />
                      </FormControl>
                      {fieldState.error && (
                        <p className="text-sm font-medium text-destructive">
                          {typeof fieldState.error.message === "string"
                            ? fieldState.error.message
                            : JSON.stringify(fieldState.error.message)}
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                {/* Ajuste */}
                <FormField
                  control={editForm.control}
                  name={`pedidos.${index}.ajuste`}
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Ajuste</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          value={
                            field.value === undefined || field.value === null
                              ? ""
                              : field.value
                          }
                          onChange={(e) => {
                            if (e.target.value === "") {
                              editForm.setValue(
                                `pedidos.${index}.ajuste`,
                                undefined as any,
                                { shouldDirty: true, shouldValidate: false },
                              );
                              return;
                            }
                            const n = Number(e.target.value);
                            editForm.setValue(
                              `pedidos.${index}.ajuste`,
                              Number.isFinite(n) && n >= 0 ? n : 0,
                              { shouldDirty: true, shouldValidate: true },
                            );
                          }}
                          onBlur={(e) => {
                            if (e.target.value === "") {
                              editForm.setValue(`pedidos.${index}.ajuste`, 0, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                            }
                          }}
                        />
                      </FormControl>
                      {fieldState.error && (
                        <p className="text-sm font-medium text-destructive">
                          {typeof fieldState.error.message === "string"
                            ? fieldState.error.message
                            : JSON.stringify(fieldState.error.message)}
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                {/* Valor aplicado */}
                <FormField
                  control={editForm.control}
                  name={`pedidos.${index}.valorAplicado`}
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Valor aplicado</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          value={
                            field.value === undefined || field.value === null
                              ? ""
                              : field.value
                          }
                          onChange={(e) => {
                            if (e.target.value === "") {
                              editForm.setValue(
                                `pedidos.${index}.valorAplicado`,
                                undefined as any,
                                { shouldDirty: true, shouldValidate: false },
                              );
                              return;
                            }
                            const n = Number(e.target.value);
                            editForm.setValue(
                              `pedidos.${index}.valorAplicado`,
                              Number.isFinite(n) && n >= 0 ? n : 0,
                              { shouldDirty: true, shouldValidate: true },
                            );
                          }}
                          onBlur={(e) => {
                            if (e.target.value === "") {
                              editForm.setValue(
                                `pedidos.${index}.valorAplicado`,
                                0,
                                { shouldDirty: true, shouldValidate: true },
                              );
                            }
                          }}
                        />
                      </FormControl>
                      {fieldState.error && (
                        <p className="text-sm font-medium text-destructive">
                          {typeof fieldState.error.message === "string"
                            ? fieldState.error.message
                            : JSON.stringify(fieldState.error.message)}
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                {/* Quitar pedido */}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => remove(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Otros pedidos disponibles del cliente */}
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
                          <p className="text-sm">
                            Fecha:{" "}
                            {new Date(p.fecha).toLocaleDateString("es-CO")}
                          </p>
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
                                ajuste: 0,
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

            {/* Botones */}
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
