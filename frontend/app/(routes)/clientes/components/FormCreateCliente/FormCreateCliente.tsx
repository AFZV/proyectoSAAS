"use client";

import { useEffect, useState } from "react";
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
import { Plus } from "lucide-react";

import { getDepartamentos } from "@/lib/getDepartamentos";
import { getCiudades } from "@/lib/getCiudades";
import { Loading } from "@/components/Loading";
import { FormCreateClienteProps } from "./FormCreateCliente.type";

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
    .max(50),
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

interface FormCreateClientePropsExtended extends FormCreateClienteProps {
  onSuccess?: () => void;
}

export function FormCreateCliente({
  setOpenModalCreate,
  onSuccess,
}: FormCreateClientePropsExtended) {
  const [isSubmiting, setIsSubmiting] = useState<boolean>(false);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);

  const { getToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      nit: "",
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
      form.setValue("ciudad", ""); // Limpiar ciudad cuando cambia departamento
    }
  }, [form.watch("departamento")]);

  // Envío del formulario - CORREGIDO
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log("🚀 Iniciando creación de cliente...");
    console.log("📝 Datos del formulario:", values);

    setIsSubmiting(true);

    try {
      // 🔑 OBTENER TOKEN
      const token = await getToken();
      console.log("🔑 Token obtenido:", token ? "✅ Sí" : "❌ No");

      if (!token) {
        throw new Error("No se pudo obtener el token de autenticación");
      }

      // 🏗️ PREPARAR PAYLOAD
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

      console.log("📦 Payload a enviar:", clientePayload);

      // 🌐 HACER PETICIÓN CON HEADERS CORRECTOS
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/clientes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // 🔥 ESTO FALTABA
          },
          body: JSON.stringify(clientePayload),
        }
      );

      console.log("📡 Response status:", response.status);
      console.log("📡 Response ok:", response.ok);

      if (!response.ok) {
        const errorData = await response.text();
        console.error("❌ Error response:", errorData);

        if (response.status === 409) {
          throw new Error("El cliente ya está registrado");
        } else if (response.status === 401) {
          throw new Error("No autorizado - verifica tu sesión");
        } else {
          throw new Error(`Error ${response.status}: ${errorData}`);
        }
      }

      const cliente = await response.json();
      console.log("✅ Cliente creado:", cliente);

      toast({
        title: "¡Cliente creado exitosamente!",
        description: `${values.nombre} ${values.apellidos} fue registrado correctamente`,
      });

      // Limpiar formulario
      form.reset();

      // Cerrar modal
      setOpenModalCreate(false);

      // Refrescar página/datos
      if (onSuccess) {
        onSuccess();
      }
      router.refresh();
    } catch (error: any) {
      console.error("💥 Error al crear cliente:", error);

      toast({
        title: "Error al crear cliente",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    } finally {
      setIsSubmiting(false);
    }
  };

  if (isSubmiting) return <Loading title="Creando Cliente..." />;

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NIT */}
            <FormField
              control={form.control}
              name="nit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIT *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Solo números (ej: 12345678)"
                      onChange={(e) => {
                        // Solo permitir números
                        const value = e.target.value.replace(/\D/g, "");
                        field.onChange(value);
                      }}
                      className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      placeholder="Nombres del cliente"
                      className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      placeholder="Apellidos del cliente"
                      className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        // Solo permitir números
                        const value = e.target.value.replace(/\D/g, "");
                        field.onChange(value);
                      }}
                      className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      placeholder="Dirección completa del cliente"
                      className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md"
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
                      className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md disabled:cursor-not-allowed disabled:opacity-50"
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
              disabled={!isValid || isSubmiting}
              className="px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-blue-500/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isSubmiting ? "Creando..." : "Crear Cliente"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
