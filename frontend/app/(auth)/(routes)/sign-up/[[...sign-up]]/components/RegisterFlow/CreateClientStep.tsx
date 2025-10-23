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
import { UserPlus, Loader2, Eye, EyeOff } from "lucide-react";
import { getDepartamentos } from "@/lib/getDepartamentos";
import { getCiudades } from "@/lib/getCiudades";

const formSchema = z
  .object({
    nit: z
      .string()
      .min(5, "NIT debe tener al menos 5 dígitos")
      .max(20, "NIT no puede tener más de 20 dígitos"),
    rasonZocial: z.string().min(2).max(100).optional(),
    nombre: z
      .string()
      .min(2, "Nombre debe tener al menos 2 caracteres")
      .max(50),
    apellidos: z
      .string()
      .min(2, "Apellidos debe tener al menos 2 caracteres")
      .max(100),
    direccion: z
      .string()
      .min(10, "Dirección debe tener al menos 10 caracteres")
      .max(100),
    telefono: z
      .string()
      .min(7, "Teléfono debe tener al menos 7 dígitos")
      .max(15),
    email: z.string().email("Correo inválido").max(50),
    departamento: z.string().min(1, "Debe seleccionar un departamento"),
    ciudad: z.string().min(1, "Debe seleccionar una ciudad"),
    empresaId: z.string().min(1, "Debe seleccionar una empresa"),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
      .regex(/[a-z]/, "Debe contener al menos una minúscula")
      .regex(/[0-9]/, "Debe contener al menos un número")
      .regex(
        /[^A-Za-z0-9]/,
        "Debe contener al menos un carácter especial (#, @, !, etc.)"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

interface Departamento {
  id: number;
  name: string;
}

interface Ciudad {
  id: number;
  name: string;
}

interface Empresa {
  id: string;
  nombre: string;
  nit: string;
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
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      empresaId: "",
      password: "",
      confirmPassword: "",
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

  // Cargar empresas públicas
  useEffect(() => {
    async function fetchEmpresas() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/clientes/public/empresas`
        );

        if (!response.ok) {
          throw new Error("Error al cargar empresas");
        }

        const data = await response.json();

        // El backend devuelve { empresas: [{ id, nombreComercial, nit, ... }] }
        // Mapear a la interfaz esperada: { id, nombre, nit }
        const empresasList = (data.empresas || []).map((emp: any) => ({
          id: emp.id,
          nombre: emp.nombreComercial,
          nit: emp.nit,
        }));

        setEmpresas(empresasList);
      } catch (error) {
        console.error("Error al cargar empresas:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las empresas disponibles",
          variant: "destructive",
        });
      } finally {
        setLoadingEmpresas(false);
      }
    }
    fetchEmpresas();
  }, [toast]);

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

      // Payload para cliente-nuevo/registrar (crea cliente + usuario + Clerk)
      const registroPayload = {
        nit: values.nit.trim(),
        nombre: values.nombre.trim(),
        apellidos: values.apellidos.trim(),
        email: values.email.trim(),
        password: values.password.trim(),
        telefono: values.telefono.trim(),
        direccion: values.direccion.trim(),
        departamento: nombreDpto,
        ciudad: nombreCiud,
        razonSocial: values.rasonZocial?.trim(),
        empresaId: values.empresaId,
      };

      // Llamar directamente al backend público
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/public/cliente-nuevo/registrar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(registroPayload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al crear cliente");
      }

      const resultado = await response.json();

      toast({
        title: "¡Cuenta creada exitosamente!",
        description: `Bienvenido ${resultado.usuario.nombre} ${resultado.usuario.apellidos}`,
      });

      // Pasar datos al padre para ir a pantalla de éxito
      // Usar los datos del usuario ya que el backend no devuelve el cliente completo
      onClientCreated({
        id: resultado.usuario.id,
        nit: values.nit, // Usamos el NIT del formulario
        nombres: resultado.usuario.nombre,
        apellidos: resultado.usuario.apellidos,
        correo: resultado.usuario.email,
      });
    } catch (error: any) {
      console.error("Error al crear cliente:", error);

      // Manejo de errores específicos
      if (error.message.includes("pwned")) {
        toast({
          title: "Contraseña insegura",
          description:
            "Esta contraseña ha sido filtrada en brechas de seguridad. Usa una contraseña más segura.",
          variant: "destructive",
        });
      } else if (error.message.includes("email")) {
        toast({
          title: "Email ya registrado",
          description: "Este email ya está en uso. Intenta iniciar sesión.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error al crear cliente",
          description: error.message || "Ocurrió un error inesperado",
          variant: "destructive",
        });
      }
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

            {/* Empresa */}
            <FormField
              control={form.control}
              name="empresaId"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Empresa *</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      disabled={loadingEmpresas}
                      className="w-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">
                        {loadingEmpresas
                          ? "Cargando empresas..."
                          : empresas.length === 0
                          ? "No hay empresas disponibles"
                          : "Seleccione una empresa"}
                      </option>
                      {empresas.map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>
                          {empresa.nombre}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                  {!loadingEmpresas && empresas.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      ⚠️ No se encontraron empresas disponibles. Contacta con
                      soporte.
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* Contraseña */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pr-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-slate-500">
                    Mínimo 8 caracteres: mayúscula, minúscula, número y carácter
                    especial
                  </p>
                </FormItem>
              )}
            />

            {/* Confirmar Contraseña */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Contraseña *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pr-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
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
              disabled={!isValid || isSubmitting || loadingEmpresas}
              className="w-full md:w-auto px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Crear Cuenta Completa
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
