"use client";

import React, { useState } from "react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UploadButton } from "@/utils/UploadThing";
import { FormCrearEmpresaProps } from "./FormCrearEmpresa.types";
import { useAuth } from "@clerk/nextjs";

const formSchema = z.object({
  nit: z.string().min(4).max(10),
  razonSocial: z.string().min(10).max(100),
  nombreComercial: z.string().min(2).max(100),
  direccion: z.string().min(10).max(100),
  telefono: z.string().min(7).max(10),
  departamento: z.string().max(50),
  ciudad: z.string().max(50),
  correo: z.string().email("Ingrese un correo válido"),
  logoUrl: z.string().url("URL del logo no es válida"),
});

export function FormCrearEmpresa({
  setOpenModalCreate,
}: FormCrearEmpresaProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const { userId } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange", // importante para validar en tiempo real
    defaultValues: {
      nit: "",
      razonSocial: "",
      nombreComercial: "",
      direccion: "",
      telefono: "",
      departamento: "",
      ciudad: "",
      correo: "",
      logoUrl: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log("📤 Enviando al backend:", values);
    try {
      if (userId)
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/empresa?userId=${userId}`,
          values
        );

      toast({ title: "Empresa creada con éxito" });
      router.refresh();
      setOpenModalCreate(false);
    } catch (error) {
      console.error("❌ Error al crear la empresa:", error);
      toast({
        title: "Error al crear la empresa",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, (err) => {
          console.log("❌ Errores en el formulario:", err);
        })}
        className="space-y-8"
      >
        <div className="grid grid-cols-3 gap-3">
          <FormField
            control={form.control}
            name="nit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>NIT</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>Sin dígito de verificación</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="razonSocial"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Razón Social</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nombreComercial"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre Comercial</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="direccion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                <FormLabel>Telefono</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="departamento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departamento</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="correo"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Correo</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="logoUrl"
            render={({ field }) => (
              <FormItem className="col-span-1">
                <FormLabel>Logo de la Empresa</FormLabel>
                <FormControl>
                  {photoUploaded ? (
                    <p className="text-sm">✅ Logo cargado</p>
                  ) : (
                    <UploadButton
                      endpoint="productImage"
                      className="bg-slate-600/20 text-slate-800 rounded-lg outline-dotted outline-3"
                      onClientUploadComplete={(res) => {
                        if (res && res.length > 0) {
                          const url = res[0].url || res[0].ufsUrl;
                          if (typeof url === "string") {
                            form.setValue("logoUrl", url, {
                              shouldValidate: true,
                            });
                            setPhotoUploaded(true);
                            toast({ title: "Logo cargado correctamente" });
                          }
                        }
                      }}
                      onUploadError={(error: Error) => {
                        toast({
                          title: "Error al subir logo",
                          content: error.message,
                          variant: "destructive",
                        });
                      }}
                    />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-center">
          <Button type="submit">Crear Empresa</Button>
        </div>
      </form>
    </Form>
  );
}
