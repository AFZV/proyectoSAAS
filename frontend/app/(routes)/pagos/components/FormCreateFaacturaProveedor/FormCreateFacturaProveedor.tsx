"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
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

import { Loading } from "@/components/Loading";
import { Plus, Upload } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

// ====== Tipos auxiliares ======
type MonedaISO = "COP" | "USD" | "CNY";

// Ajusta si tu enum real difiere:
type EstadoFacturaProvEnum = "ABIERTA" | "PARCIAL" | "PAGADA" | "ANULADA";

interface ProveedorItem {
  idProveedor: string; // ajusta si tu campo es distinto
  razonsocial: string;
  identificacion?: string;
}

const monedas: MonedaISO[] = ["COP", "USD", "CNY"];
const estados: EstadoFacturaProvEnum[] = [
  "ABIERTA",
  "PARCIAL",
  "PAGADA",
  "ANULADA",
];

// ====== Zod Schema alineado al DTO ======
const formSchema = z
  .object({
    proveedorId: z.string().min(1, "Debe seleccionar un proveedor"),
    numero: z.string().min(1, "Número de documento requerido"),
    fechaEmision: z
      .string()
      .optional()
      .refine(
        (v) => !v || !Number.isNaN(Date.parse(v)),
        "Fecha de emisión inválida (use formato YYYY-MM-DD)"
      ),
    fechaVencimiento: z
      .string()
      .optional()
      .refine(
        (v) => !v || !Number.isNaN(Date.parse(v)),
        "Fecha de vencimiento inválida (use formato YYYY-MM-DD)"
      ),
    moneda: z.enum(monedas as [MonedaISO, ...MonedaISO[]]).default("COP"),
    tasaCambio: z
      .number({ invalid_type_error: "Debe ser un número" })
      .min(0, "No puede ser negativa")
      .optional(),
    total: z
      .number({ invalid_type_error: "Debe ser un número" })
      .min(0, "El total no puede ser negativo"),
    notas: z.string().max(500).optional(),
    estado: z
      .enum(estados as [EstadoFacturaProvEnum, ...EstadoFacturaProvEnum[]])
      .default("ABIERTA"),
    compraId: z.string().optional(),
    // Campo auxiliar del front para archivo:
  })
  .refine(
    (vals) =>
      vals.moneda === "COP" ? true : typeof vals.tasaCambio === "number",
    {
      message: "La tasa de cambio es obligatoria si la moneda no es COP",
      path: ["tasaCambio"],
    }
  );

type FormValues = z.infer<typeof formSchema>;

export function FormCreateFacturaProveedor({
  onSuccess,
  setOpenModalCreate,
}: {
  onSuccess?: () => void;
  setOpenModalCreate?: (v: boolean) => void;
}) {
  const [isSubmiting, setIsSubmiting] = useState(false);
  const [proveedores, setProveedores] = useState<ProveedorItem[]>([]);
  const { getToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      proveedorId: "",
      numero: "",
      fechaEmision: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
      fechaVencimiento: "",
      moneda: "COP",
      tasaCambio: undefined,
      total: 0,
      notas: "",

      estado: "ABIERTA",
      compraId: "",
    },
  });

  const moneda = form.watch("moneda");
  const isMonedaExtranjera = useMemo(() => moneda !== "COP", [moneda]);

  // Cargar proveedores
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/proveedores/all`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        console.log("Proveedores cargados:", data);

        let normalized: ProveedorItem[] = [];
        if (Array.isArray(data)) normalized = data;
        else if (data && typeof data === "object") normalized = [data];
        setProveedores(
          normalized.map((p: any) => ({
            idProveedor: p.idProveedor ?? p.id ?? p.proveedorId,
            razonsocial: p.razonsocial ?? p.razonsocial ?? "Proveedor",
            identificacion: p.identificacion,
          }))
        );
      } catch (err) {
        console.error("Error al cargar proveedores", err);
        setProveedores([]);
      }
    })();
  }, [getToken]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmiting(true);
    try {
      const token = await getToken();
      if (!token)
        throw new Error("No se pudo obtener el token de autenticación");

      // Construir payload conforme al DTO
      const payload = {
        proveedorId: values.proveedorId,
        numero: values.numero.trim(),
        fechaEmision: values.fechaEmision || undefined,
        fechaVencimiento: values.fechaVencimiento || undefined,
        moneda: values.moneda,
        tasaCambio:
          values.moneda === "COP"
            ? undefined
            : typeof values.tasaCambio === "number"
            ? values.tasaCambio
            : undefined,
        total: Number(values.total),
        notas: values.notas?.trim() || undefined,
        estado: values.estado,
        compraId: values.compraId?.trim() || undefined,
      };

      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/facturas-proveedor/create`,
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
        if (resp.status === 409)
          throw new Error("Ya existe una factura con ese número");
        if (resp.status === 401)
          throw new Error("No autorizado - verifica tu sesión");
        throw new Error(`Error ${resp.status}: ${errorData}`);
      }

      const factura = await resp.json();

      toast({
        title: "¡Factura creada!",
        description: `Factura #${factura.numero} registrada correctamente`,
      });

      form.reset();
      setOpenModalCreate?.(false);
      onSuccess?.();
      router.refresh();
    } catch (error: any) {
      console.error("💥 Error al crear factura proveedor:", error);
      toast({
        title: "Error al crear factura",
        description: error?.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    } finally {
      setIsSubmiting(false);
    }
  };

  if (isSubmiting) return <Loading title="Creando Factura de Proveedor..." />;

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

            {/* Número */}
            <FormField
              control={form.control}
              name="numero"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de factura *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: FAC-000123"
                      className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fecha Emisión */}
            <FormField
              control={form.control}
              name="fechaEmision"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Emisión</FormLabel>
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

            {/* Fecha Vencimiento */}
            <FormField
              control={form.control}
              name="fechaVencimiento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Vencimiento</FormLabel>
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
                  <FormLabel>Moneda</FormLabel>
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
                    Tasa de Cambio {isMonedaExtranjera ? "*" : "(opcional)"}
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

            {/* Total */}
            <FormField
              control={form.control}
              name="total"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={typeof field.value === "number" ? field.value : 0}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === "" ? 0 : Number(val));
                      }}
                      placeholder="0.00"
                      className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estado */}
            <FormField
              control={form.control}
              name="estado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {estados.map((e) => (
                        <option key={e} value={e}>
                          {e}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* compraId (opcional) */}
            <FormField
              control={form.control}
              name="compraId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Compra vinculada (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="UUID de la compra (si corresponde)"
                      className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notas */}
            <FormField
              control={form.control}
              name="notas"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Observaciones de la factura"
                      className="min-h-[90px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Botón de envío */}
          <div className="flex justify-center pt-4">
            <Button
              type="submit"
              disabled={isSubmiting || !form.formState.isValid}
              className="px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-blue-500/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isSubmiting ? "Creando..." : "Crear Factura de Proveedor"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
