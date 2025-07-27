// app/reportes/(components)/FormReportes/FormReportes.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Download,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
} from "lucide-react";
import { FormReportesProps, Vendedor } from "./FormReportes.types";
import { useAuth } from "@clerk/nextjs";

// ✅ SCHEMAS ESPECÍFICOS
const formatoBaseSchema = z.object({
  formato: z.enum(["excel", "pdf"]),
});

const inventarioGeneralSchema = formatoBaseSchema;

const inventarioRangoSchema = formatoBaseSchema.extend({
  inicio: z.string().min(1, "Letra inicial requerida").max(1),
  fin: z.string().min(1, "Letra final requerida").max(1),
});

const clientesTodosSchema = formatoBaseSchema;

const clientesCiudadSchema = formatoBaseSchema.extend({
  ciudad: z.string().min(1, "Ciudad requerida"),
});

const clientesVendedorSchema = formatoBaseSchema.extend({
  vendedorId: z.string().min(1, "Vendedor requerido"),
});

const pedidosConFechasSchema = formatoBaseSchema.extend({
  fechaInicio: z.string().min(1, "Fecha inicial requerida"),
  fechaFin: z.string().min(1, "Fecha final requerida"),
});

const pedidosVendedorSchema = formatoBaseSchema.extend({
  fechaInicio: z.string().min(1, "Fecha inicial requerida"),
  fechaFin: z.string().min(1, "Fecha final requerida"),
  vendedorId: z.string().min(1, "Vendedor requerido"),
});

const carteraConFechasSchema = formatoBaseSchema.extend({
  fechaInicio: z.string().min(1, "Fecha inicial requerida"),
  fechaFin: z.string().min(1, "Fecha final requerida"),
});
const recaudoGeneralSchema = formatoBaseSchema.extend({
  fechaInicio: z.string().min(1, "Fecha inicial requerida"),
  fechaFin: z.string().min(1, "Fecha final requerida"),
});
//Se agrega recaudos
const recaudoVendedorSchema = formatoBaseSchema.extend({
  fechaInicio: z.string().min(1, "Fecha inicial requerida"),
  fechaFin: z.string().min(1, "Fecha final requerida"),
  vendedorId: z.string().min(1, "Vendedor requerido"),
});

const carteraVendedorSchema = formatoBaseSchema.extend({
  fechaInicio: z.string().min(1, "Fecha inicial requerida"),
  fechaFin: z.string().min(1, "Fecha final requerida"),
  vendedorId: z.string().min(1, "Vendedor requerido"),
});

const balanceGeneralSchema = formatoBaseSchema;

export function FormReportes({ tipo, opcion, onClose }: FormReportesProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loadingVendedores, setLoadingVendedores] = useState(false);
  const { toast } = useToast();
  const { getToken } = useAuth();

  // Obtener vendedores si es necesario
  useEffect(() => {
    if (opcion === "vendedor") {
      obtenerVendedores();
    }
  }, [opcion]);

  const obtenerVendedores = async () => {
    console.log("renderSpecificFields - tipo:", tipo, "opcion:", opcion);

    try {
      setLoadingVendedores(true);
      const token = await getToken();
      const BACKEND_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

      const vendedoresResponse = await fetch(
        `${BACKEND_URL}/usuario/usuarios/empresa`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!vendedoresResponse.ok) {
        throw new Error("Error al obtener vendedores");
      }

      const usuarios = await vendedoresResponse.json();

      // Filtrar solo vendedores y admins activos
      const vendedoresFiltrados = usuarios.filter(
        (usuario: any) =>
          usuario.estado === "activo" &&
          (usuario.rol === "vendedor" || usuario.rol === "admin")
      );

      setVendedores(vendedoresFiltrados);
      console.log("✅ Vendedores para Select:", vendedoresFiltrados);
    } catch (error) {
      console.error("Error al cargar vendedores:", error);

      // FALLBACK: Vendedores hardcodeados con IDs reales
      const vendedoresTemporales: Vendedor[] = [
        { id: "usuario-real-1", nombre: "Juan", apellidos: "Pérez" },
        { id: "usuario-real-2", nombre: "María", apellidos: "García" },
        { id: "usuario-real-3", nombre: "Carlos", apellidos: "López" },
      ];
      setVendedores(vendedoresTemporales);

      toast({
        title: "⚠️ Usando vendedores de prueba",
        description:
          "Reemplaza los IDs con vendedores reales de tu base de datos",
        variant: "destructive",
      });
    } finally {
      setLoadingVendedores(false);
    }
  };

  // ✅ FUNCIÓN PARA MANEJAR CLIC EN PDF
  const handlePdfClick = () => {
    toast({
      title: "🚧 Próximamente disponible",
      description:
        "Estamos trabajando en esta funcionalidad. Los reportes en PDF estarán disponibles próximamente. Usa Excel por ahora.",
      variant: "destructive",
    });
  };

  // ✅ FUNCIÓN PARA OBTENER SCHEMA CORRECTO
  const getSchema = () => {
    if (tipo === "inventario") {
      if (opcion === "general") return inventarioGeneralSchema;
      if (opcion === "rango") return inventarioRangoSchema;
    }

    if (tipo === "clientes") {
      if (opcion === "todos") return clientesTodosSchema;
      if (opcion === "ciudad") return clientesCiudadSchema;
      if (opcion === "vendedor") return clientesVendedorSchema;
    }

    if (tipo === "pedidos") {
      if (opcion === "todos") return pedidosConFechasSchema;
      if (opcion === "vendedor") return pedidosVendedorSchema;
    }

    if (tipo === "cartera") {
      if (opcion === "general") return carteraConFechasSchema;
      if (opcion === "vendedor") return carteraVendedorSchema;
      if (opcion === "balance") return balanceGeneralSchema;
    }

    if (tipo === "recaudos") {
      if (opcion === "general") return recaudoGeneralSchema;
      if (opcion === "vendedor") return recaudoVendedorSchema;
    }

    return formatoBaseSchema;
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

  // Función para llamar al backend
  const generarReporte = async (data: any) => {
    const token = await getToken();
    const BACKEND_URL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    let endpoint = "";
    let method = "GET";
    let body = {};

    // Endpoints según tu backend
    if (tipo === "inventario") {
      if (opcion === "general") {
        endpoint = `/reportes/inventario/${data.formato}`;
        method = "GET";
        body = {};
      } else if (opcion === "rango") {
        endpoint = `/reportes/inventario/rango/${data.formato}`;
        console.log("datos enviados de rango:,", { data });
        method = "POST";
        body = {
          inicio: data.inicio.toUpperCase(),
          fin: data.fin.toUpperCase(),
        };
      } else if (opcion === "productos") {
        endpoint = `/reportes/inventario/productos/${data.formato}`;
        method = "GET";
      }
    } else if (tipo === "clientes") {
      if (opcion === "todos") {
        endpoint = `/reportes/clientes/${data.formato}`;
        method = "POST";
        body = {};
      } else if (opcion === "ciudad") {
        endpoint = `/reportes/clientes/ciudad/${data.formato}`;
        method = "POST";
        body = { ciudad: data.ciudad };
      } else if (opcion === "vendedor") {
        endpoint = `/reportes/clientes/vendedor/${data.vendedorId}/${data.formato}`;
        method = "POST";
        body = {};
      }
    } else if (tipo === "pedidos") {
      if (opcion === "todos") {
        endpoint = `/reportes/pedidos/${data.formato}`;
        method = "POST";
        body = {
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
        };
      } else if (opcion === "vendedor") {
        endpoint = `/reportes/pedidos/${data.formato}/${data.vendedorId}`;
        method = "POST";
        body = {
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
        };
      }
    } else if (tipo === "cartera") {
      if (opcion === "general") {
        endpoint = `/reportes/cartera/${data.formato}`;
        method = "POST";
        body = {
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
        };
      } else if (opcion === "vendedor") {
        endpoint = `/reportes/cartera/${data.formato}/vendedor/${data.vendedorId}`;
        method = "POST";
        body = {
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
        };
      } else if (opcion === "balance") {
        endpoint = `/reportes/balance-general/${data.formato}`;
        method = "POST";
        body = {};
      }
    } else if (tipo === "recaudos") {
      if (opcion === "general" || opcion === "todos") {
        endpoint = `/reportes/recaudo/${data.formato}`;
        method = "POST";
        body = {
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
        };
        console.log("📤 GENERAL configurado:", { endpoint, method, body });
      } else if (opcion === "vendedor") {
        endpoint = `/reportes/recaudo-vendedor/${data.vendedorId}/${data.formato}`;
        method = "POST";
        body = {
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
        };
      }
    }

    console.log("🚀 Llamando al backend:", {
      endpoint: `${BACKEND_URL}${endpoint}`,
      method,
      body,
    });

    const fetchOptions: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };

    if (method === "POST") {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${BACKEND_URL}${endpoint}`, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Error del backend:", errorText);
      throw new Error(
        `Error ${response.status}: ${errorText || response.statusText}`
      );
    }

    // Manejar descarga
    const blob = await response.blob();

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

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
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

  // ✅ FUNCIÓN PARA DETERMINAR SI NECESITA FECHAS
  const necesitaFechas = (): boolean => {
    return (
      tipo === "pedidos" ||
      tipo === "recaudos" ||
      (tipo === "cartera" && opcion !== "balance")
    );
  };

  const renderSpecificFields = () => {
    // Campos para inventario por rango
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

    // Campo para clientes por ciudad
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

    // Campo para reportes por vendedor
    if (opcion === "vendedor") {
      return (
        <FormField
          control={form.control}
          name="vendedorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vendedor</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={loadingVendedores}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingVendedores
                          ? "Cargando vendedores..."
                          : "Selecciona un vendedor"
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {loadingVendedores ? (
                    <SelectItem value="loading" disabled>
                      <div className="flex items-center gap-2">
                        <LoaderCircle className="w-4 h-4 animate-spin" />
                        Cargando...
                      </div>
                    </SelectItem>
                  ) : vendedores.length > 0 ? (
                    vendedores.map((vendedor) => (
                      <SelectItem key={vendedor.id} value={vendedor.id}>
                        {vendedor.nombre} {vendedor.apellidos || ""}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-vendedores" disabled>
                      No hay vendedores disponibles
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
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
        {/* ✅ SELECTOR DE FORMATO CON PDF INACTIVO */}
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

                  {/* ✅ BOTÓN PDF INACTIVO CON MENSAJE */}
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 opacity-50 cursor-not-allowed hover:bg-gray-50 border-gray-200"
                    onClick={handlePdfClick}
                    disabled={false} // No disabled para que funcione el onClick
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                    <span className="ml-2 text-xs">🚧</span>
                  </Button>
                </div>
              </FormControl>
              <FormMessage />

              {/* ✅ MENSAJE INFORMATIVO SOBRE PDF */}
              <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded-lg">
                <span>🚧</span>
                <span>
                  Próximamente disponible - Estamos trabajando en esta
                  funcionalidad
                </span>
              </div>
            </FormItem>
          )}
        />

        {/* Rango de fechas - Solo cuando sea necesario */}
        {necesitaFechas() && (
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
        )}

        {/* Campos específicos */}
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
                {!necesitaFechas() &&
                  " Este reporte incluye todos los registros disponibles."}
                {tipo === "cartera" &&
                  opcion === "balance" &&
                  " El Balance General muestra el resumen total sin filtros de fecha."}
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
