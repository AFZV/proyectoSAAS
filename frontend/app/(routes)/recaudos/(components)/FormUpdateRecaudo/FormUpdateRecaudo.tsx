"use client";

import { useEffect, useRef, useState } from "react";
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
        // Ambos campos son editables. Permitimos undefined durante escritura.
        valorAplicado: z.number().nonnegative().optional(),
        ajuste: z.number().min(0).optional(),
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

  // Mapas auxiliares (saldo/flete sólo informativos)

  // para no recalcular inicial más de una vez
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

  const { fields, append, remove, update } = useFieldArray({
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

      // 1) Recibo base
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/recibos/getById/${values.idRecibo}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = res.data;

      // 2) Ajustes por pedido (si existen)
      let ajustesMap: Record<string, number> = {};
      try {
        const aj = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/recibos/ajustesporrecibo/ajustes/${values.idRecibo}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        (aj.data as AjusteItem[]).forEach((a) => {
          ajustesMap[a.idPedido] = Number(a.ajuste || 0);
        });
      } catch {
        ajustesMap = {};
      }

      // 3) Form editable (sin auto-recalcular al cambiar ajuste)
      const reciboEditable: ReciboEditable = {
        clienteId: data.clienteId,
        tipo: String(data.tipo).toLowerCase() as ReciboEditable["tipo"],
        concepto: data.concepto,
        pedidos: (data.detalleRecibo || []).map((d: any) => ({
          pedidoId: d.idPedido,
          valorAplicado: Number(d.valorTotal), // inicial
          ajuste: ajustesMap[d.idPedido] ?? 0, // inicial
        })),
      };

      editForm.reset(reciboEditable);
      setStep("edit");
      toast({ title: "Recibo encontrado", duration: 1500 });

      // 4) Pedidos con saldo (para mostrar saldo/flete y, UNA sola vez, ajustar valorAplicado inicial si quieres)
      const pendientes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/recibos/PedidosSaldoPendiente/${data.clienteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const arr: PedidoPendiente[] = pendientes.data || [];
      setPedidosDisponibles(arr);

      // 5) Mapas saldo/flete

      // 7) (Opcional) Ajuste inicial único: valorAplicado := max(0, saldo - ajuste)
      //    Sólo al cargar, para que no salte luego al editar.

      inicializadoRef.current = true;
    } catch (error) {
      toast({ title: "Recibo no encontrado", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  /* -----------------------
   * Actualizar recibo
   * ----------------------- */
  const onUpdate = async (values: z.infer<typeof formSchema>) => {
    const idRecibo = searchForm.getValues("idRecibo");
    if (!idRecibo) return;
    setIsUpdating(true);
    try {
      const token = await getToken();

      // 👇 Normaliza y mapea a 'descuento' (NO 'ajuste')
      const pedidosPayload = (values.pedidos ?? []).map((p) => ({
        pedidoId: p.pedidoId,
        valorAplicado: Number.isFinite(p.valorAplicado as number)
          ? Number(p.valorAplicado)
          : 0,
        descuento: Number.isFinite((p as any).ajuste) // por si tu form aún usa "ajuste"
          ? Number((p as any).ajuste)
          : Number((p as any).descuento) || 0,
      }));

      const payload = {
        clienteId: values.clienteId, // asegúrate que esté seteado al cargar el recibo
        tipo: values.tipo,
        concepto: values.concepto,
        pedidos: pedidosPayload,
      };

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/recibos/actualizar/${idRecibo}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast({ title: "Recibo actualizado correctamente" });
      setOpenModalUpdate(false);
      router.refresh();
    } catch (error: any) {
      // ayuda para depurar si vuelve a fallar
      console.error("Update error:", error?.response?.data || error);
      toast({
        title: "Error al actualizar recibo",
        description:
          error?.response?.data?.message ||
          error?.response?.data ||
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
              render={({ field }) => (
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Concepto */}
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

            {/* Pedidos */}
            {fields.map((field, index) => {
              const pid = editForm.watch(`pedidos.${index}.pedidoId`);

              return (
                <div
                  key={field.id}
                  className="grid grid-cols-4 gap-4 items-end border rounded-md p-3"
                >
                  {/* Pedido */}
                  <FormField
                    control={editForm.control}
                    name={`pedidos.${index}.pedidoId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pedido</FormLabel>
                        <FormControl>
                          <Input {...field} disabled className="bg-muted" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Ajuste (editable) */}
                  <FormField
                    control={editForm.control}
                    name={`pedidos.${index}.ajuste`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ajuste</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            value={
                              field.value === undefined || field.value === null
                                ? ""
                                : field.value
                            }
                            onChange={(e) => {
                              // permitir vacío sin forzar 0
                              if (e.target.value === "") {
                                editForm.setValue(
                                  `pedidos.${index}.ajuste`,
                                  undefined as any,
                                  {
                                    shouldDirty: true,
                                    shouldValidate: false,
                                  }
                                );
                                return;
                              }
                              const n = Number(e.target.value);
                              editForm.setValue(
                                `pedidos.${index}.ajuste`,
                                Number.isFinite(n) && n >= 0 ? n : 0,
                                { shouldDirty: true, shouldValidate: true }
                              );
                              // IMPORTANTE: NO recalculamos valorAplicado aquí.
                            }}
                            onBlur={(e) => {
                              if (e.target.value === "") {
                                editForm.setValue(
                                  `pedidos.${index}.ajuste`,
                                  0,
                                  { shouldDirty: true, shouldValidate: true }
                                );
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Valor aplicado (editable, sin sobrescribir) */}
                  <FormField
                    control={editForm.control}
                    name={`pedidos.${index}.valorAplicado`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor aplicado</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
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
                                  {
                                    shouldDirty: true,
                                    shouldValidate: false,
                                  }
                                );
                                return;
                              }
                              const n = Number(e.target.value);
                              editForm.setValue(
                                `pedidos.${index}.valorAplicado`,
                                Number.isFinite(n) && n >= 0 ? n : 0,
                                { shouldDirty: true, shouldValidate: true }
                              );
                            }}
                            onBlur={(e) => {
                              if (e.target.value === "") {
                                editForm.setValue(
                                  `pedidos.${index}.valorAplicado`,
                                  0,
                                  { shouldDirty: true, shouldValidate: true }
                                );
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Quitar */}
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
              );
            })}

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
                                // inicial: el usuario lo puede cambiar
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
