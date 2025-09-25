"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, CheckCircle2, Trash2 } from "lucide-react";
import { Loading } from "@/components/Loading";
import { getRandomValues } from "crypto";

// ====== Tipos auxiliares ======
type MonedaISO = "COP" | "USD" | "CNY"; // ajusta según tu enum real
const monedas: MonedaISO[] = ["COP", "USD", "CNY"];

type MetodoPagoProvEnum =
  | "EFECTIVO"
  | "TRANSFERENCIA"
  | "TARJETA"
  | "CHEQUE"
  | "OTRO";

const metodos: MetodoPagoProvEnum[] = [
  "EFECTIVO",
  "TRANSFERENCIA",
  "TARJETA",
  "CHEQUE",
  "OTRO",
];

// Lo mínimo para listar proveedores y facturas pendientes
interface ProveedorItem {
  idProveedor: string;
  razonsocial: string;
  identificacion?: string;
}

interface FacturaPendienteItem {
  idFacturaProveedor: string;
  numero: string;
  saldo: number; // saldo en la moneda de la factura
  moneda: MonedaISO;
  tasaCambio?: number | null; // si aplica
  fechaEmision?: string;
  fechaVencimiento?: string | null;
}

// ====== Zod Schema ======
const detalleSchema = z.object({
  facturaId: z.string().min(1, "Requerido"),
  numero: z.string(), // sólo UI
  moneda: z.enum(monedas as [MonedaISO, ...MonedaISO[]]), // sólo UI
  saldoFactura: z.number().nonnegative(), // sólo UI (validación)
  valor: z
    .number({ invalid_type_error: "Debe ser un número" })
    .positive("Debe ser mayor a 0"),
  descuento: z
    .number({ invalid_type_error: "Debe ser un número" })
    .min(0, "No puede ser negativo")
    .optional()
    .default(0),
});

const formSchema = z
  .object({
    proveedorId: z.string().min(1, "Debe seleccionar un proveedor"),
    fecha: z
      .string()
      .optional()
      .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Fecha inválida"),
    moneda: z.enum(monedas as [MonedaISO, ...MonedaISO[]]).default("COP"),
    tasaCambio: z
      .number({ invalid_type_error: "Debe ser un número" })
      .min(0, "No puede ser negativa")
      .optional(),
    metodoPago: z.enum(
      metodos as [MetodoPagoProvEnum, ...MetodoPagoProvEnum[]]
    ),
    descripcion: z.string().max(500).optional(),
    detalles: z
      .array(detalleSchema)
      .min(1, "Agrega al menos una factura con abono"),
  })
  // Si moneda != COP -> tasaCambio obligatoria (del pago)
  .refine(
    (v) => (v.moneda === "COP" ? true : typeof v.tasaCambio === "number"),
    {
      message: "La tasa de cambio es obligatoria si la moneda no es COP",
      path: ["tasaCambio"],
    }
  )
  // Todas las facturas seleccionadas deben coincidir con la moneda del pago
  .refine((v) => v.detalles.every((d) => d.moneda === v.moneda), {
    message: "La moneda del pago debe coincidir con la de todas las facturas",
    path: ["moneda"],
  })
  // Cada valor no puede exceder el saldo de su factura
  .superRefine((v, ctx) => {
    v.detalles.forEach((d, idx) => {
      const neto = d.valor - (d.descuento ?? 0);
      if (d.valor > d.saldoFactura) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["detalles", idx, "valor"],
          message: "No puede superar el saldo de la factura",
        });
      }
      if (neto < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["detalles", idx, "descuento"],
          message: "El descuento no puede superar el valor", // neto >= 0
        });
      }
    });
  });

export type FormValuesPago = z.infer<typeof formSchema>;

export function FormCreatePagoProveedor({
  onSuccess,
  setOpenModalCreate,
}: {
  onSuccess?: () => void;
  setOpenModalCreate?: (v: boolean) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proveedores, setProveedores] = useState<ProveedorItem[]>([]);
  const [facturas, setFacturas] = useState<FacturaPendienteItem[]>([]);
  const { getToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormValuesPago>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      proveedorId: "",
      fecha: new Date().toISOString().slice(0, 10),
      moneda: "COP",
      tasaCambio: undefined,
      metodoPago: "TRANSFERENCIA",
      descripcion: "",
      detalles: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "detalles",
  });

  const monedaPago = form.watch("moneda");
  const isMonedaExtranjera = useMemo(() => monedaPago !== "COP", [monedaPago]);
  const proveedorSel = form.watch("proveedorId");

  // Cargar proveedores
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/proveedores/all`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        let normalized: ProveedorItem[] = [];
        if (Array.isArray(data)) normalized = data;
        else if (data && typeof data === "object") normalized = [data];
        setProveedores(
          normalized.map((p: any) => ({
            idProveedor: p.idProveedor ?? p.id ?? p.proveedorId,
            razonsocial: p.razonsocial ?? p.nombre ?? "Proveedor",
            identificacion: p.identificacion ?? p.nit,
          }))
        );
      } catch (err) {
        console.error("Error al cargar proveedores", err);
        setProveedores([]);
      }
    })();
  }, [getToken]);

  // Cargar facturas por proveedor con saldo > 0
  useEffect(() => {
    if (!proveedorSel) {
      setFacturas([]);
      form.setValue("detalles", []);
      return;
    }
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/facturas-proveedor/facturas/saldos/${proveedorSel}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        const list: FacturaPendienteItem[] = (
          Array.isArray(data) ? data : []
        ).map((f: any) => ({
          idFacturaProveedor: f.idFacturaProveedor ?? f.id ?? f.facturaId,
          numero: f.numero,
          saldo: Number(f.saldo ?? 0),
          moneda: (f.moneda as MonedaISO) ?? "COP",
          tasaCambio:
            typeof f.tasaCambio === "number" ? f.tasaCambio : undefined,
          fechaEmision: f.fechaEmision
            ? String(f.fechaEmision).slice(0, 10)
            : undefined,
          fechaVencimiento: f.fechaVencimiento
            ? String(f.fechaVencimiento).slice(0, 10)
            : undefined,
        }));
        setFacturas(list.filter((x) => x.saldo > 0));
      } catch (err) {
        console.error("Error al cargar facturas pendientes", err);
        setFacturas([]);
      }
    })();
  }, [proveedorSel, getToken, form]);

  // Helpers
  const totalBruto = useMemo(
    () =>
      (form.getValues("detalles") || []).reduce(
        (acc, d) => acc + (Number(d.valor) || 0),
        0
      ),
    [fields]
  );
  const totalDescuentos = useMemo(
    () =>
      (form.getValues("detalles") || []).reduce(
        (acc, d) => acc + (Number(d.descuento) || 0),
        0
      ),
    [fields]
  );
  const totalNeto = useMemo(
    () => totalBruto - totalDescuentos,
    [totalBruto, totalDescuentos]
  );

  const addDetalleFromFactura = (f: FacturaPendienteItem) => {
    // Evitar duplicados por factura
    const yaExiste = (form.getValues("detalles") || []).some(
      (d) => d.facturaId === f.idFacturaProveedor
    );
    if (yaExiste) return;
    // Si la moneda del pago difiere, ajustamos el pago a la moneda de la primera factura agregada
    const detallesActuales = form.getValues("detalles");
    if (!detallesActuales || detallesActuales.length === 0) {
      if (f.moneda !== monedaPago) {
        form.setValue("moneda", f.moneda, { shouldValidate: true });
      }
    }
    append({
      facturaId: f.idFacturaProveedor,
      numero: f.numero,
      moneda: f.moneda,
      saldoFactura: f.saldo,
      valor: f.saldo, // por defecto "abonar saldo"
      descuento: 0,
    });
  };

  const fillAll = () => {
    // Agrega todas las facturas con su saldo restante
    facturas.forEach(addDetalleFromFactura);
  };

  const clearDetalles = () => form.setValue("detalles", []);

  const onSubmit = async (values: FormValuesPago) => {
    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (!token)
        throw new Error("No se pudo obtener el token de autenticación");

      // business rule: totalPagado = sum(valor - descuento)
      const totalPagado = values.detalles.reduce(
        (acc, d) => acc + (Number(d.valor) - Number(d.descuento ?? 0)),
        0
      );

      // Construir payload para backend
      const payload = {
        proveedorId: values.proveedorId,
        fecha: values.fecha || undefined,
        moneda: values.moneda,
        tasaCambio: values.tasaCambio || 0,
        descripcion: values.descripcion?.trim() || undefined,
        totalPagado: Number(totalPagado.toFixed(2)),
        metodoPago: values.metodoPago || "OTRO",
        detalles: values.detalles.map((d) => ({
          facturaId: d.facturaId,
          valor: Number(d.valor),
          descuento: d.descuento ? Number(d.descuento) : undefined,
        })),
      };

      //       {
      //   "proveedorId": "de7a1c9e-1a2b-4e0d-9e5e-7b2f8b7d9f3a",
      //   "fecha": "2025-09-23",
      //   "moneda": "COP",
      //   "metodoPago": "TRANSFERENCIA",
      //   "descripcion": "Pago parcial facturas septiembre",
      //   "detalles": [
      //     { "facturaId": "0f5b8c0d-8b1e-4c3f-9a9c-12d34e56f789", "valor": 300000 },
      //     { "facturaId": "2a345678-90ab-cdef-1234-567890abcdef", "valor": 200000, "descuento": 10000 }
      //   ]
      // }
      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/pagos-proveedor/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!resp.ok) {
        const errorData = await resp.text();
        console.error("❌ Error response:", errorData);
        if (resp.status === 401)
          throw new Error("No autorizado - verifica tu sesión");
        throw new Error(`Error ${resp.status}: ${errorData}`);
      }

      const pago = await resp.json();

      toast({
        title: "¡Pago registrado!",
        description: `Pago #${
          pago.idPagoProveedor?.slice(0, 8) ?? ""
        } creado por ${payload.totalPagado} ${payload.moneda}`,
      });

      form.reset();
      setOpenModalCreate?.(false);
      onSuccess?.();
      router.refresh();
    } catch (error: any) {
      console.error("💥 Error al crear pago proveedor:", error);
      toast({
        title: "Error al crear pago",
        description: error?.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) return <Loading title="Registrando pago a proveedor..." />;

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Proveedor */}
            <FormField
              control={form.control}
              name="proveedorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proveedor *</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccione un proveedor</option>
                      {proveedores.map((p) => (
                        <option key={p.idProveedor} value={p.idProveedor}>
                          {p.razonsocial}{" "}
                          {p.identificacion ? `(${p.identificacion})` : ""}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fecha */}
            <FormField
              control={form.control}
              name="fecha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Moneda */}
            <FormField
              control={form.control}
              name="moneda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Moneda del pago</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {monedas.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tasa Cambio (condicional) */}
            <FormField
              control={form.control}
              name="tasaCambio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Tasa de cambio {isMonedaExtranjera ? "*" : "(opcional)"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.0001"
                      min={0}
                      disabled={!isMonedaExtranjera}
                      value={
                        typeof field.value === "number"
                          ? field.value
                          : field.value ?? ""
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === "" ? undefined : Number(val));
                      }}
                      placeholder={
                        isMonedaExtranjera ? "Ej: 4060.50" : "Sólo si no es COP"
                      }
                      className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Método de pago */}
            <FormField
              control={form.control}
              name="metodoPago"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de pago *</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {metodos.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descripción */}
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Observaciones del pago"
                      className="min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Selector de facturas con saldo */}
          <Card className="border-dashed">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-1">
                  <h4 className="font-semibold">
                    Facturas con saldo del proveedor
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Agrega una o varias facturas y define el abono (y descuento
                    si aplica). La moneda del pago debe coincidir con la de las
                    facturas.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={fillAll}
                    disabled={!facturas.length}
                  >
                    Abonar todos los saldos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearDetalles}
                    disabled={!fields.length}
                  >
                    Limpiar
                  </Button>
                </div>
              </div>

              <div className="grid gap-3">
                {facturas.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No hay facturas con saldo para este proveedor.
                  </p>
                )}

                {facturas.map((f) => {
                  const ya = fields.findIndex(
                    (d) => d.facturaId === f.idFacturaProveedor
                  );
                  const yaAgregada = ya >= 0;
                  return (
                    <div
                      key={f.idFacturaProveedor}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">#{f.numero}</span>
                          <Badge variant="secondary">{f.moneda}</Badge>
                          {f.fechaVencimiento && (
                            <span className="text-xs text-muted-foreground">
                              Vence: {f.fechaVencimiento}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Saldo: {f.saldo.toLocaleString()} {f.moneda}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {yaAgregada ? (
                          <Badge className="gap-1" variant="outline">
                            <CheckCircle2 className="w-3 h-3" /> Agregada
                          </Badge>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => addDetalleFromFactura(f)}
                          >
                            Agregar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {fields.length > 0 && (
                <div className="space-y-3">
                  <Separator />
                  <h5 className="font-semibold">Detalles del pago</h5>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-sm font-medium text-muted-foreground">
                    <div className="md:col-span-4">Factura</div>
                    <div className="md:col-span-2 text-right">Saldo</div>
                    <div className="md:col-span-2 text-right">Abono</div>
                    <div className="md:col-span-2 text-right">Descuento</div>
                    <div className="md:col-span-2 text-right">Acciones</div>
                  </div>
                  {fields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
                    >
                      <div className="md:col-span-4">
                        <div className="font-medium">#{field.numero}</div>
                        <div className="text-xs text-muted-foreground">
                          Moneda: {field.moneda} · saldo:{" "}
                          {Number(field.saldoFactura).toLocaleString()}
                        </div>
                      </div>
                      <div className="md:col-span-2 text-right">
                        {Number(field.saldoFactura).toLocaleString()}
                      </div>
                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`detalles.${idx}.valor`}
                          render={({ field: f }) => (
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              {...f}
                              onChange={(e) => {
                                const n =
                                  e.target.value === ""
                                    ? 0
                                    : Number(e.target.value);
                                f.onChange(n);
                              }}
                              className="text-right"
                            />
                          )}
                        />
                      </div>
                      <div className="md:col-span-2">
                        {/* Descuento */}
                        <FormField
                          control={form.control}
                          name={`detalles.${idx}.descuento`}
                          render={({ field: f }) => (
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              {...f}
                              onChange={(e) => {
                                const n =
                                  e.target.value === ""
                                    ? 0
                                    : Number(e.target.value);
                                f.onChange(n);
                              }}
                              className="text-right"
                            />
                          )}
                        />
                      </div>
                      <div className="md:col-span-2 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => remove(idx)}
                          aria-label="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Separator className="my-2" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botón de envío */}
          <div className="flex justify-center pt-2">
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !form.formState.isValid ||
                fields.length === 0 ||
                totalNeto <= 0
              }
              className="px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-blue-500/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isSubmitting ? "Creando..." : "Registrar pago a proveedor"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
