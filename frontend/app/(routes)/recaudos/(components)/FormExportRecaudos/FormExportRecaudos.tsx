// app/recaudos/(components)/FormExportRecaudosHeader.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// ───────────────── tipos ─────────────────

type Props = {
  /** "general" = todos los recaudos de la empresa; "vendedor" = solo del usuario logueado */
  onClose: () => void;
};

// schema súper simple solo para este caso
const exportRecaudosSchema = z.object({
  formato: z.literal("excel"), // solo excel por ahora
  fechaInicio: z.string().min(1, "Fecha inicial requerida"),
  fechaFin: z.string().min(1, "Fecha final requerida"),
});

type ExportRecaudosValues = z.infer<typeof exportRecaudosSchema>;

// ───────────────── componente ─────────────────

export function FormExportRecaudosHeader({ onClose }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { getToken } = useAuth();

  const form = useForm<ExportRecaudosValues>({
    resolver: zodResolver(exportRecaudosSchema),
    defaultValues: {
      formato: "excel",
      fechaInicio: "",
      fechaFin: "",
    },
  });

  const handlePdfClick = () => {
    toast({
      title: "🚧 Próximamente disponible",
      description:
        "La descarga en PDF aún no está disponible. Por ahora solo puedes generar el reporte en Excel.",
      variant: "destructive",
    });
  };

  const onSubmit = async (data: ExportRecaudosValues) => {
    try {
      setIsLoading(true);

      const token = await getToken();
      const BACKEND_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

      // endpoint según modo
      const endpoint = `recibos/exportar/excel`;

      const body = {
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
      };

      const res = await fetch(`${BACKEND_URL}/${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Error ${res.status}`);
      }

      const blob = await res.blob();
      if (blob.size === 0) {
        throw new Error(
          "El archivo generado viene vacío. Verifica el rango de fechas."
        );
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${data.fechaInicio}_${data.fechaFin}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "✅ Reporte generado",
        description: "El archivo Excel se ha descargado automáticamente.",
      });

      onClose();
    } catch (error) {
      console.error(error);
      toast({
        title: "❌ Error al generar el reporte",
        description:
          error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Formato de descarga */}
        <FormField
          control={form.control}
          name="formato"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Formato de descarga</FormLabel>
              <FormControl>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  {/* Excel activo */}
                  <Button
                    type="button"
                    variant="default"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => field.onChange("excel")}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Excel
                  </Button>

                  {/* PDF inactivo */}
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 opacity-50 cursor-not-allowed hover:bg-gray-50 border-gray-200"
                    onClick={handlePdfClick}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                    <span className="ml-2 text-xs">🚧</span>
                  </Button>
                </div>
              </FormControl>

              <div className="mt-2 flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded-lg">
                <span>🚧</span>
                <span>
                  Por ahora solo está disponible la descarga en Excel. El
                  archivo se descargará automáticamente cuando el reporte esté
                  listo.
                </span>
              </div>
            </FormItem>
          )}
        />

        {/* Fechas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fechaInicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha inicial</FormLabel>
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
                <FormLabel>Fecha final</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">Información del reporte:</p>
          <p>
            El archivo se descargará automáticamente una vez generado. Los
            reportes en Excel permiten un mejor análisis de los recaudos.
          </p>
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
                Generar reporte
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
