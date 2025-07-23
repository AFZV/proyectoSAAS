"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FormCrearUsuarioProps } from "./FormCrearUsuario.types";
import { useAuth } from "@clerk/nextjs";
import { Loading } from "@/components/Loading";

const formSchema = z.object({
  codigo: z.string().min(5),
  nombre: z.string().min(2),
  apellidos: z.string().min(2),
  correo: z.string().email(),
  telefono: z.string().min(7),
  rol: z.enum(["admin", "vendedor", "superadmin", "bodega", "temporal"]),
  empresaId: z.string().uuid(),
});

type Empresa = {
  id: string;
  nombreComercial: string;
};

export function FormCrearUsuario({
  setOpenModalUsuarioCreate,
  refetchUsuarios,
  usuarioId,
}: FormCrearUsuarioProps & { usuarioId?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmiting, setIsSubmiting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo: "",
      nombre: "",
      apellidos: "",
      correo: "",
      telefono: "",
      rol: "vendedor",
      empresaId: "",
    },
  });

  // Cargar empresas
  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const token = await getToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/empresa/all`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-cache",
          }
        );

        const data = await res.json();
        const empresasFiltradas: Empresa[] = data.map((empresa: any) => ({
          id: empresa.id,
          nombreComercial: empresa.nombreComercial,
        }));
        setEmpresas(empresasFiltradas);
      } catch (error) {
        toast({ title: "Error al cargar empresas", variant: "destructive" });
      }
    };

    fetchEmpresas();
  }, []);

  // Si estamos editando, cargar usuario
  useEffect(() => {
    const fetchUsuario = async () => {
      if (!usuarioId) {
        setIsLoading(false);
        return;
      }

      try {
        const token = await getToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/usuario/${usuarioId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = await res.json();
        form.reset(data);
      } catch (error) {
        toast({ title: "Error al cargar usuario", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsuario();
  }, [usuarioId]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmiting(true);
      const token = await getToken();

      const url = usuarioId
        ? `${process.env.NEXT_PUBLIC_API_URL}/usuario/${usuarioId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/usuario`;

      const method = usuarioId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error("Error al guardar usuario");

      toast({
        title: usuarioId
          ? "Usuario actualizado con éxito"
          : "Usuario creado con éxito",
      });

      refetchUsuarios();
      setOpenModalUsuarioCreate(false);
    } catch (error) {
      console.error("Error al guardar usuario:", error);
      toast({
        title: "Error al guardar usuario",
        variant: "destructive",
      });
    } finally {
      setIsSubmiting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loading title="Cargando usuario..." />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="codigo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código</FormLabel>
              <FormControl>
                <Input {...field} placeholder="ID de Clerk" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombres</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="apellidos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Apellidos</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="correo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="telefono"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input type="tel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rol</FormLabel>
              <FormControl>
                <select {...field} className="w-full border p-2 rounded">
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                  <option value="bodega">Bodega</option>
                  <option value="temporal">Temporal</option>
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="empresaId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Empresa</FormLabel>
              <FormControl>
                <select {...field} className="w-full border p-2 rounded">
                  <option value="">Seleccione una empresa</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nombreComercial}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-center">
          <Button type="submit" disabled={isSubmiting}>
            {usuarioId ? "Actualizar Usuario" : "Crear Usuario"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
