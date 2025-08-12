"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
type Cliente = {
  id: string;
  nit?: string;
  rasonZocial?: string;
  nombre?: string;
  apellidos?: string;
  email?: string;
  telefono?: string;
  ciudad?: string;
};

// ===== Schema SIN NIT =====
const formSchema = z.object({
  id: z.string().min(1, "Debes seleccionar un cliente"),
  tipo: z.enum(["efectivo", "consignacion"]),
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

// ===== Selector de clientes con modal (carga todos + filtro local) =====
function ClienteSelector({
  token,
  onSelect,
  endpointAll = `${process.env.NEXT_PUBLIC_API_URL}/clientes/all-min`,
}: {
  token: string;
  onSelect: (c: Cliente) => void;
  endpointAll?: string;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputTriggerRef = useRef<HTMLInputElement>(null);
  const [display, setDisplay] = useState(""); // texto visible en el trigger

  // normaliza para buscar sin tildes
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

  // cargar todos los clientes una sola vez
  useEffect(() => {
    if (!token) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
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
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [endpointAll, token, toast]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return clientes;
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
    // ordenar con exactos NIT arriba
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
    onSelect(c);
    setDisplay(
      c.rasonZocial || `${c.nombre || ""} ${c.apellidos || ""}`.trim()
    );
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

  return (
    <div className="space-y-2">
      <FormLabel>Cliente</FormLabel>
      <div className="flex gap-2">
        <Input
          ref={inputTriggerRef as any}
          value={display}
          readOnly
          placeholder="Click para seleccionar (buscar por nombre/NIT)"
          onClick={() => setOpen(true)}
          className="cursor-pointer"
        />
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          Buscar
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v)
            requestAnimationFrame(() =>
              (inputTriggerRef.current as any)?.blur()
            );
        }}
      >
        <DialogContent className="max-w-3xl w-[90vw] max-h-[80vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Seleccionar cliente</DialogTitle>
          </DialogHeader>

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
  );
}

// ===== Form principal =====
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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

  // Obtener token
  useEffect(() => {
    const fetchToken = async () => {
      const t = await getToken();
      if (t) setToken(t);
    };
    fetchToken();
  }, [getToken]);

  // Traer pedidos con saldo del cliente seleccionado
  useEffect(() => {
    if (!clienteInfo?.id || !token) return;

    const fetchPedidos = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/recibos/PedidosSaldoPendiente/${clienteInfo.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("No se pudo cargar pedidos pendientes");
        const data = await res.json();
        setPedidosDisponibles(data || []);
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {isSubmitting && <Loading title="Creando Recibo..." />}

        {/* Selector de Cliente (reemplaza el campo NIT) */}
        <ClienteSelector
          token={token}
          onSelect={(c) => {
            form.setValue("id", c.id, { shouldValidate: true });
            setClienteInfo({
              id: c.id,
              nombre: c.rasonZocial || `${c.nombre} ${c.apellidos}`,
              email: c.email || "",
              ciudad: c.ciudad || "",
              telefono: c.telefono || "",
            });
            // limpiar listas si cambias de cliente
            setPedidosDisponibles([]);
            remove();
          }}
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
                    Pedido #{p.id.slice(0, 6).toUpperCase()}
                  </p>
                  <p className="text-sm font-medium">
                    Fecha: {new Date(p.fecha).toLocaleDateString("es-CO")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Valor Original: {p.valorOriginal.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Saldo: {p.saldoPendiente.toLocaleString()}
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
          <Button
            type="submit"
            disabled={isSubmitting}
            className="
              bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700
              hover:from-blue-600 hover:to-blue-800
              text-white font-semibold
              shadow-md hover:shadow-lg
              disabled:opacity-50 disabled:pointer-events-none
              transition-all duration-200
            "
          >
            {isSubmitting ? "Creando..." : "Crear Recibo"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
