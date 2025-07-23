import React, { useEffect, useState } from "react";
import { FormUpdateUsuarioProps } from "./FormUpdateUsuario.types";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Edit3, RefreshCw, Search } from "lucide-react";
import { Loading } from "@/components/Loading";
import { useToast } from "@/hooks/use-toast";

import { useAuth } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";

import { useRouter } from "next/navigation";

import { useForm } from "react-hook-form";
import z from "zod";
import { Input } from "@/components/ui/input";

const searchSchema = z.object({
  correo: z.string().min(1, "Ingrese correo para buscar").email(),
});

const formSchema = z.object({
  id: z.string().min(2),
  codigo: z.string().min(2),
  nombre: z.string().min(2).max(50),
  apellidos: z.string().min(10).max(50),
  telefono: z.string().min(1).max(10),
  correo: z.string().min(1),
  rol: z.string().min(1),
  nombreEmpresa: z.string().min(1),
});

interface Usuario {
  id: string;
  codigo: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  correo: string;
  rol: string;
  empresa: {
    nombreComercial: string;
  };
}

export function FormUpdateUsuario({
  setOpenModalUpdate,
}: FormUpdateUsuarioProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);

  const { getToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const searchForm = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
  });

  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (usuarioActual) {
      editForm.reset({
        id: usuarioActual.id,
        codigo: usuarioActual.codigo,
        nombre: usuarioActual.nombre,
        apellidos: usuarioActual.apellidos,
        telefono: usuarioActual.telefono,
        correo: usuarioActual.correo,
        rol: usuarioActual.rol,
        nombreEmpresa: usuarioActual.empresa.nombreComercial,
      });
    }
  }, [usuarioActual]);

  const onSearch = async (values: z.infer<typeof searchSchema>) => {
    setIsSearching(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuario/correo/${values.correo}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.status !== 200) throw new Error();

      const usuario = await res.json();

      setUsuarioActual({
        ...usuario,
      });
      toast({
        title: "Usuario encontrado",
        variant: "default",
        duration: 2000,
      });
    } catch {
      toast({
        title: "Usuario no encontrado",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const onUpdate = async (values: z.infer<typeof formSchema>) => {
    if (!usuarioActual) return;

    const usuarioPayload = {
      nombre: values.nombre,
      apellidos: values.apellidos,
      telefono: values.telefono,
      correo: values.correo,
      rol: values.rol,
    };

    setIsUpdating(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuario/update-id/${usuarioActual.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(usuarioPayload),
        }
      );

      if (res.ok) {
        toast({ title: "Usuario actualizado exitosamente" });
        router.refresh();
        setOpenModalUpdate(false);
      } else {
        toast({ title: "Error al actualizar Usuario", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error inesperado", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBack = () => {
    setUsuarioActual(null);
    editForm.reset();
    searchForm.reset();
  };

  if (isUpdating) return <Loading title="Actualizando Empresa..." />;

  return (
    <div className="space-y-6">
      {!usuarioActual ? (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-center">
            Buscar Usuario por correo
          </h3>
          <Form {...searchForm}>
            <form
              onSubmit={searchForm.handleSubmit(onSearch)}
              className="space-y-4"
            >
              <FormField
                control={searchForm.control}
                name="correo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: usuario@gmail.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSearching}>
                {isSearching ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Buscar Usuario
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Editar Usuario</h3>
            <Button variant="outline" onClick={handleBack}>
              Buscar Otra
            </Button>
          </div>
          <Form key={usuarioActual.id} {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onUpdate)}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                {[
                  "id",
                  "codigo",
                  "nombre",
                  "apellidos",
                  "telefono",
                  "correo",
                  "nombreEmpresa",
                ].map((field) => (
                  <FormField
                    key={field}
                    control={editForm.control}
                    name={field as keyof z.infer<typeof formSchema>}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel>{field}</FormLabel>
                        <FormControl>
                          <Input
                            {...formField}
                            disabled={
                              field === "id" ||
                              field === "codigo" ||
                              field === "nombreEmpresa"
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                <FormField
                  control={editForm.control}
                  name="rol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rol</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full border rounded px-2 py-1"
                        >
                          <option value="">Selecciona un rol</option>
                          <option value="admin">Admin</option>
                          <option value="bodega">Bodega</option>
                          <option value="vendedor">Vendedor</option>
                          <option value="superadmin">SuperAdmin</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-center pt-4">
                <Button type="submit" className="px-8">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Actualizar Empresa
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}
