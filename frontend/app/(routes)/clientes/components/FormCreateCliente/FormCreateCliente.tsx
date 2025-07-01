"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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

import { getDepartamentos } from "@/lib/getDepartamentos";
import { getCiudades } from "@/lib/getCiudades";
import { Loading } from "@/components/Loading";
import { FormCreateClienteProps } from "./FormCreateCliente.type";

const formSchema = z.object({
  nit: z.string().min(2).max(10),
  razonSocial: z.string().min(2).max(50).optional(),
  nombre: z.string().min(2).max(50),
  apellidos: z.string().min(2).max(50),
  direccion: z.string().min(10).max(50),
  telefono: z.string().min(1).max(10),
  email: z.string().email("Correo inválido").max(50).optional(),
  departamento: z.string().min(1),
  ciudad: z.string().min(1),
});

interface Departamento {
  id: number;
  name: string;
}

interface Ciudad {
  id: number;
  name: string;
}

interface UsuarioActual {
  usuarioId: string;
  empresaId: string;
  rol: string;
}

export function FormCreateCliente(props: FormCreateClienteProps) {
  const { setOpenModalCreate } = props;
  const [isSubmiting, setIsSubmiting] = useState<boolean>(false);

  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [usuarioActual, setUsuarioActual] = useState<UsuarioActual | null>(
    null
  );

  const [token, setToken] = useState<string>();
  const [loadingUsuario, setLoadingUsuario] = useState(true);
  const { getToken } = useAuth();

  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
  });

  const { isValid } = form.formState;

  useEffect(() => {
    const fetchToken = async () => {
      const resToken = await getToken();
      setToken(resToken as string);
    };

    fetchToken();
  }, [getToken]);

  // Obtener usuario actual
  useEffect(() => {
    const fetchUsuario = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/usuario-actual`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setUsuarioActual(res.data);
        console.log("✅ Usuario actual:", res.data);
      } catch (err) {
        console.error("❌ Error al obtener datos del usuario:", err);
      } finally {
        setLoadingUsuario(false);
      }
    };

    fetchUsuario();
  }, [token]);

  // Cargar departamentos
  useEffect(() => {
    async function fetchDepartamentos() {
      const res = await getDepartamentos();
      const data = await res.json();
      setDepartamentos(data);
    }

    fetchDepartamentos();
  }, []);

  // Cargar ciudades por departamento
  useEffect(() => {
    const selectedDptoId = form.watch("departamento");

    if (selectedDptoId) {
      const fetchCiudades = async () => {
        const data = await getCiudades(String(selectedDptoId));
        setCiudades(data);
      };
      fetchCiudades();
    } else {
      setCiudades([]);
    }
  }, [form.watch("departamento")]);

  // Envío del formulario
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (
      !usuarioActual ||
      !usuarioActual.rol ||
      !usuarioActual.empresaId ||
      !usuarioActual.usuarioId
    ) {
      toast({
        title: "Faltan datos del usuario autenticado",
        variant: "destructive",
      });
      return;
    }
    setIsSubmiting(true);

    try {
      const nombreDpto =
        departamentos.find((d) => d.id.toString() === values.departamento)
          ?.name || "";
      const nombreCiud =
        ciudades.find((c) => c.id.toString() === values.ciudad)?.name || "";

      const clientePayload = {
        nit: values.nit,
        rasonZocial: values.razonSocial,
        nombre: values.nombre,
        apellidos: values.apellidos,
        direccion: values.direccion,
        telefono: values.telefono,
        email: values.email,
        departamento: nombreDpto,
        ciudad: nombreCiud,
      };

      const clienteRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/clientes`,
        {
          method: "POST",
          body: JSON.stringify(clientePayload),
        }
      );
      const cliente = await clienteRes.json();
      console.log("nuevo cliente:", cliente);

      toast({ title: "Cliente registrado exitosamente" });
      router.refresh();
      setOpenModalCreate(false);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        toast({
          title: "El cliente ya está registrado en esta empresa",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error al crear el cliente", variant: "destructive" });
      }
    } finally {
      setIsSubmiting(false);
    }
  };

  if (loadingUsuario) {
    return (
      <p className="text-center text-muted-foreground">
        Cargando datos del usuario...
      </p>
    );
  }

  if (isSubmiting) return <Loading title="Creando Cliente" />;

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-2 gap-3">
            {/* Campos del cliente */}
            {(
              [
                "nit",
                "razonSocial",
                "nombre",
                "apellidos",
                "telefono",
                "email",
                "direccion",
              ] as const
            ).map((name) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {name.charAt(0).toUpperCase() + name.slice(1)}
                    </FormLabel>
                    <FormControl>
                      <Input type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <FormField
              control={form.control}
              name="departamento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Departamento</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full border p-2 rounded">
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

            <FormField
              control={form.control}
              name="ciudad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full border p-2 rounded">
                      <option value="">Seleccione una ciudad</option>
                      {ciudades.map((ciud) => (
                        <option key={ciud.id} value={ciud.id}>
                          {ciud.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-center">
            <Button type="submit" disabled={!isValid || !usuarioActual}>
              Crear Cliente
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
