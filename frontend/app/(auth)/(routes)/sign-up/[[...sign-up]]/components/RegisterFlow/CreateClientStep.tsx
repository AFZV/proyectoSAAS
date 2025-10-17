"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
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
import { UserPlus, Loader2 } from "lucide-react";
import { getDepartamentos } from "@/lib/getDepartamentos";
import { getCiudades } from "@/lib/getCiudades";

const formSchema = z.object({
  nit: z
    .string()
    .min(5, "NIT debe tener al menos 5 dígitos")
    .max(20, "NIT no puede tener más de 20 dígitos"),
  rasonZocial: z.string().min(2).max(100).optional(),
  nombre: z.string().min(2, "Nombre debe tener al menos 2 caracteres").max(50),
  apellidos: z
    .string()
    .min(2, "Apellidos debe tener al menos 2 caracteres")
    .max(100),
  direccion: z
    .string()
    .min(10, "Dirección debe tener al menos 10 caracteres")
    .max(100),
  telefono: z.string().min(7, "Teléfono debe tener al menos 7 dígitos").max(15),
  email: z.string().email("Correo inválido").max(50),
  departamento: z.string().min(1, "Debe seleccionar un departamento"),
  ciudad: z.string().min(1, "Debe seleccionar una ciudad"),
});

interface Departamento {
  id: number;
  name: string;
}

interface Ciudad {
  id: number;
  name: string;
}

interface CreateClientStepProps {
  nitPrecargado: string;
  onClientCreated: (client: {
    id: string;
    nit: string;
    nombres: string;
    apellidos: string;
    correo: string;
  }) => void;
}

export function CreateClientStep({
  nitPrecargado,
  onClientCreated,
}: CreateClientStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      nit: nitPrecargado,
      rasonZocial: "",
      nombre: "",
      apellidos: "",
      direccion: "",
      telefono: "",
      email: "",
      departamento: "",
      ciudad: "",
    },
  });

  const { isValid } = form.formState;

  // Cargar departamentos
  useEffect(() => {
    async function fetchDepartamentos() {
      try {
        const res = await getDepartamentos();
        const data = await res.json();
        setDepartamentos(data);
      } catch (error) {
        console.error("Error al cargar departamentos:", error);
      }
    }
    fetchDepartamentos();
  }, []);

  // Cargar ciudades por departamento
  useEffect(() => {
    const selectedDptoId = form.watch("departamento");

    if (selectedDptoId) {
      const fetchCiudades = async () => {
        try {
          const data = await getCiudades(String(selectedDptoId));
          setCiudades(data);
        } catch (error) {
          console.error("Error al cargar ciudades:", error);
        }
      };
      fetchCiudades();
    } else {
      setCiudades([]);
      form.setValue("ciudad", "");
    }
  }, [form.watch("departamento")]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    try {
      const nombreDpto =
        departamentos.find((d) => d.id.toString() === values.departamento)
          ?.name || "";
      const nombreCiud =
        ciudades.find((c) => c.id.toString() === values.ciudad)?.name || "";

      const clientePayload = {
        nit: values.nit.trim(),
        rasonZocial: values.rasonZocial?.trim() || "",
        nombre: values.nombre.trim(),
        apellidos: values.apellidos.trim(),
        direccion: values.direccion.trim(),
        telefono: values.telefono.trim(),
        email: values.email.trim(),
        departamento: nombreDpto,
        ciudad: nombreCiud,
      };

      // Crear cliente sin autenticación (endpoint público)
      const response = await fetch(`/api/clientes/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clientePayload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        if (response.status === 409) {
          throw new Error("El cliente ya está registrado");
        } else {
          throw new Error(`Error ${response.status}: ${errorData}`);
        }
      }

      const cliente = await response.json();

      toast({
        title: "¡Cliente creado exitosamente!",
        description: `${values.nombre} ${values.apellidos} fue registrado correctamente`,
      });

      onClientCreated({
        id: cliente.id,
        nit: cliente.nit,
        nombres: cliente.nombre,
        apellidos: cliente.apellidos,
        correo: cliente.email,
      });
    } catch (error: any) {
      console.error("Error al crear cliente:", error);
      toast({
        title: "Error al crear cliente",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-sm text-blue-700">
          <strong>NIT {nitPrecargado}</strong> no está registrado. Completa tus
          datos para crear tu perfil de cliente.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NIT (deshabilitado) */}
            <FormField
              control={form.control}
              name="nit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIT *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled
                      className="bg-slate-100 border-slate-200 rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Razón Social */}
            <FormField
              control={form.control}
              name="rasonZocial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razón Social</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Opcional"
                      className="bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nombre */}
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombres *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Tus nombres"
                      className="bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Apellidos */}
            <FormField
              control={form.control}
              name="apellidos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellidos *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Tus apellidos"
                      className="bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      {...field}
                      placeholder="correo@ejemplo.com"
                      className="bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Teléfono */}
            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="3001234567"
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        field.onChange(value);
                      }}
                      className="bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dirección */}
            <FormField
              control={form.control}
              name="direccion"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Dirección *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Dirección completa"
                      className="bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Departamento */}
            <FormField
              control={form.control}
              name="departamento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Departamento *</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccione un departamento</option>
                      {departamentos.map((dep) => (
                        <option key={dep.id} value={dep.id}>
                          {dep.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ciudad */}
            <FormField
              control={form.control}
              name="ciudad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad *</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      disabled={!form.watch("departamento")}
                      className="w-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Seleccione una ciudad</option>
                      {ciudades.map((ciudad) => (
                        <option key={ciudad.id} value={ciudad.id}>
                          {ciudad.name}
                        </option>
                      ))}
                    </select>
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
              disabled={!isValid || isSubmitting}
              className="w-full md:w-auto px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando perfil...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Crear Perfil de Cliente
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
