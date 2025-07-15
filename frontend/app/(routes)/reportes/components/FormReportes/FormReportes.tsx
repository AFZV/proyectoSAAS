// app/reportes/(components)/FormReportes/FormReportes.tsx
"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { FormReportesProps } from "./FormReportes.types";
import { useAuth } from "@clerk/nextjs";

// Schema base
const baseSchema = z.object({
  formato: z.enum(["excel", "pdf"]),
  fechaInicio: z.string().min(1, "Fecha inicial requerida"),
  fechaFin: z.string().min(1, "Fecha final requerida"),
});

// Schemas específicos
const rangoSchema = baseSchema.extend({
  inicio: z.string().min(1, "Letra inicial requerida").max(1),
  fin: z.string().min(1, "Letra final requerida").max(1),
});

const ciudadSchema = baseSchema.extend({
  ciudad: z.string().min(1, "Ciudad requerida"),
});

const vendedorSchema = baseSchema.extend({
  vendedorId: z.string().min(1, "Vendedor requerido"),
});

export function FormReportes({ tipo, opcion, onClose }: FormReportesProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { getToken } = useAuth();

  // Función para llamar al backend directamente
  const generarReporte = async (data: any) => {
    // ❌ Verificar PDF primero
    if (data.formato === "pdf") {
      toast({
        title: "🚧 Función en construcción",
        description:
          "Los reportes en PDF estarán disponibles próximamente. Usa Excel por ahora.",
        variant: "destructive",
      });
      return;
    }

    const token = await getToken();
    const BACKEND_URL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    let endpoint = "";
    let body = {};

    // Determinar endpoint según tipo y opción - EXACTAMENTE como el backend
    if (tipo === "inventario") {
      if (opcion === "general") {
        endpoint = `/reportes/inventario/excel`;
        body = {
          fechaInicio: data.fechaInicio, // El backend espera string, no ISO
          fechaFin: data.fechaFin,
        };
      } else if (opcion === "rango") {
        endpoint = `/reportes/inventario/rango/excel`;
        body = {
          inicio: data.inicio.toUpperCase(),
          fin: data.fin.toUpperCase(),
        };
      }
    } else if (tipo === "clientes") {
      if (opcion === "todos") {
        endpoint = `/reportes/clientes/excel`;
        body = {}; // Backend no espera body para este endpoint
      } else if (opcion === "ciudad") {
        endpoint = `/reportes/clientes/ciudad/excel`;
        body = { ciudad: data.ciudad };
      } else if (opcion === "vendedor") {
        // ⚠️ IMPORTANTE: Backend usa /clientes/vendedor/:id/excel
        endpoint = `/reportes/clientes/vendedor/${data.vendedorId}/excel`;
        body = {}; // Vendedor va en URL, no en body
      }
    } else if (tipo === "pedidos") {
      if (opcion === "todos") {
        endpoint = `/reportes/pedidos/excel`;
        body = {
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
        };
      } else if (opcion === "vendedor") {
        // ⚠️ IMPORTANTE: Backend usa /pedidos/excel/:id
        endpoint = `/reportes/pedidos/excel/${data.vendedorId}`;
        body = {
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
        };
      }
    } else if (tipo === "cartera") {
      if (opcion === "general") {
        endpoint = `/reportes/cartera/excel`;
        body = {
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
        };
      } else if (opcion === "vendedor") {
        // ⚠️ IMPORTANTE: Backend usa /cartera/excel/vendedor/:vendedorId
        endpoint = `/reportes/cartera/excel/vendedor/${data.vendedorId}`;
        body = {
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
        };
      }
    }

    console.log("🚀 Llamando al backend:", {
      endpoint: `${BACKEND_URL}${endpoint}`,
      body,
      method: "POST",
    });

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Error del backend:", errorText);
      throw new Error(
        `Error ${response.status}: ${errorText || response.statusText}`
      );
    }

    // Manejar descarga
    const blob = await response.blob();

    // Verificar que el blob no esté vacío
    if (blob.size === 0) {
      throw new Error(
        "El archivo descargado está vacío. Verifica los filtros aplicados."
      );
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte-${tipo}-${opcion}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    console.log("✅ Descarga completada:", `reporte-${tipo}-${opcion}.xlsx`);
  };

  // Determinar el schema según el tipo y opción
  const getSchema = () => {
    if (tipo === "inventario" && opcion === "rango") return rangoSchema;
    if (tipo === "clientes" && opcion === "ciudad") return ciudadSchema;
    if (
      (tipo === "clientes" || tipo === "pedidos" || tipo === "cartera") &&
      opcion === "vendedor"
    ) {
      return vendedorSchema;
    }
    return baseSchema;
  };

  const form = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: {
      formato: "excel" as const,
      fechaInicio: "",
      fechaFin: "",
      inicio: "",
      fin: "",
      ciudad: "",
      vendedorId: "",
    },
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      // Llamada directa al backend
      await generarReporte(data);

      toast({
        title: "✅ Reporte generado exitosamente",
        description: "El archivo se ha descargado automáticamente",
      });

      onClose();
    } catch (error) {
      console.error("Error al generar reporte:", error);
      toast({
        title: "❌ Error al generar reporte",
        description:
          error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderSpecificFields = () => {
    // Campos específicos según tipo y opción
    if (tipo === "inventario" && opcion === "rango") {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="inicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Letra Inicial</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="A"
                    maxLength={1}
                    className="uppercase"
                    onChange={(e) =>
                      field.onChange(e.target.value.toUpperCase())
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Letra Final</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Z"
                    maxLength={1}
                    className="uppercase"
                    onChange={(e) =>
                      field.onChange(e.target.value.toUpperCase())
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      );
    }

    if (tipo === "clientes" && opcion === "ciudad") {
      return (
        <FormField
          control={form.control}
          name="ciudad"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ciudad</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ej: Bogotá, Medellín, Cali..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    if (
      (tipo === "clientes" || tipo === "pedidos" || tipo === "cartera") &&
      opcion === "vendedor"
    ) {
      return (
        <FormField
          control={form.control}
          name="vendedorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vendedor</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un vendedor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {/* ⚠️ TEMPORAL: IDs reales para testing */}
                  <SelectItem value="test-vendedor-1">
                    Juan Pérez (ID: test-vendedor-1)
                  </SelectItem>
                  <SelectItem value="test-vendedor-2">
                    María García (ID: test-vendedor-2)
                  </SelectItem>
                  <SelectItem value="test-vendedor-3">
                    Carlos López (ID: test-vendedor-3)
                  </SelectItem>
                  {/* 💡 TODO: Hacer fetch a /usuario/vendedores para obtener lista real */}
                </SelectContent>
              </Select>
              <FormMessage />
              <p className="text-xs text-muted-foreground">
                💡 Usa un ID de vendedor real de tu base de datos
              </p>
            </FormItem>
          )}
        />
      );
    }

    return null;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Selector de formato */}
        <FormField
          control={form.control}
          name="formato"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Formato de descarga</FormLabel>
              <FormControl>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Button
                    type="button"
                    variant={field.value === "excel" ? "default" : "outline"}
                    className={`flex-1 ${
                      field.value === "excel"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                    }`}
                    onClick={() => field.onChange("excel")}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                  <Button
                    type="button"
                    variant={field.value === "pdf" ? "default" : "outline"}
                    className={`flex-1 ${
                      field.value === "pdf"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                    }`}
                    onClick={() => field.onChange("pdf")}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Rango de fechas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fechaInicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha Inicial</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fechaFin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha Final</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Información sobre los campos específicos */}
        {renderSpecificFields()}

        {/* Nota informativa */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 text-xs font-bold">ℹ</span>
            </div>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Información del reporte:</p>
              <p>
                El archivo se descargará automáticamente una vez generado. Los
                reportes en Excel permiten mayor análisis de datos.
              </p>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto min-w-[100px] order-2 sm:order-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto min-w-[140px] bg-blue-600 hover:bg-blue-700 order-1 sm:order-2"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Generando...
              </div>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Generar Reporte
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
