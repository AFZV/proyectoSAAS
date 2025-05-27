"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
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
const formSchema = z.object({
  codigo: z.string().min(5),
  nombres: z.string().min(2),
  apellidos: z.string().min(2),
  correo: z.string().email(),
  telefono: z.string().min(7),
  rol: z.enum(["admin", "vendedor", "superadmin"]),
  empresaId: z.string().uuid(),
});

type Empresa = {
  id: string;
  nombreComercial: string;
};

export function FormCrearUsuario({
  setOpenModalUsuarioCreate,
}: FormCrearUsuarioProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const { userId } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo: "",
      nombres: "",
      apellidos: "",
      correo: "",
      telefono: "",
      rol: "vendedor",
      empresaId: "",
    },
  });

  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        if (userId) {
          const res = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/empresa?userId=${userId}`
          );
          console.log("response:", res);
          setEmpresas(res.data);
        }
      } catch (error) {
        console.error("Error al cargar empresas:", error);
        toast({
          title: "Error al cargar empresas",
          variant: "destructive",
        });
      }
    };

    fetchEmpresas();
  }, [toast]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log("valores a enviar al backend:", values);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/usuario`, values);
      toast({ title: "Usuario creado con éxito" });
      router.refresh();
      setOpenModalUsuarioCreate(false);
    } catch (error) {
      console.error("Error al crear usuario:", error);
      toast({
        title: "Error al crear usuario",
        variant: "destructive",
      });
    }
  };

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
                <Input {...field} placeholder="ID de Clerk u otro código" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="nombres"
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
                  <option value="bodega">Bodega</option>
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
          <Button type="submit">Crear Usuario</Button>
        </div>
      </form>
    </Form>
  );
}
