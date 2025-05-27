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
  nombres: z.string().min(2).max(50),
  apellidos: z.string().min(2).max(50),
  direccion: z.string().min(10).max(50),
  telefono: z.string().min(1).max(10),
  email: z.string().email("Correo inválido").max(50).optional(),
  codigoDpto: z.string().min(1),
  codigoCiud: z.string().min(1),
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
  const { userId } = useAuth();
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [usuarioActual, setUsuarioActual] = useState<UsuarioActual | null>(
    null
  );
  const [loadingUsuario, setLoadingUsuario] = useState(true);

  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
  });

  const { isValid } = form.formState;

  // Obtener usuario actual
  useEffect(() => {
    const fetchUsuario = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/usuario-actual`,
          {
            headers: { Authorization: userId },
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
  }, [userId]);

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
    const selectedDptoId = form.watch("codigoDpto");

    if (selectedDptoId) {
      const fetchCiudades = async () => {
        const data = await getCiudades(String(selectedDptoId));
        setCiudades(data);
      };
      fetchCiudades();
    } else {
      setCiudades([]);
    }
  }, [form.watch("codigoDpto")]);

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
        departamentos.find((d) => d.id.toString() === values.codigoDpto)
          ?.name || "";
      const nombreCiud =
        ciudades.find((c) => c.id.toString() === values.codigoCiud)?.name || "";

      const clientePayload = {
        nit: values.nit,
        nombres: values.nombres,
        apellidos: values.apellidos,
        direccion: values.direccion,
        telefono: values.telefono,
        email: values.email,
        codigoDpto: nombreDpto,
        codigoCiud: nombreCiud,
      };

      const clienteRes = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/clientes`,
        clientePayload
      );
      const clienteId = clienteRes.data.id;

      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/cliente-empresa`, {
        clienteId,
        empresaId: usuarioActual.empresaId,
        vendedorId: usuarioActual.usuarioId, // ✅ confirmado que es UUID de usuario
      });

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
                "nombres",
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
              name="codigoDpto"
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
              name="codigoCiud"
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
