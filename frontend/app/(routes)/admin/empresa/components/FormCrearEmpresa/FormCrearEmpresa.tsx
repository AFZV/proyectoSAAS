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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FormCrearEmpresaProps } from "./FormCrearEmpresa.types";
import { useAuth } from "@clerk/nextjs";
import { getCiudades } from "@/lib/getCiudades";
import { getDepartamentos } from "@/lib/getDepartamentos";
import { Loading } from "@/components/Loading";

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

interface Departamento {
  id: number;
  name: string;
}

interface Ciudad {
  id: number;
  name: string;
}

async function subirLogoEmpresa(
  file: File,
  token: string,
  onSuccess: (url: string) => void,
  onError: (error: string) => void
) {
  const formData = new FormData();
  formData.append("imagen", file);

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/cloudinary/upload/producto`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Error al subir imagen");
    }

    const data = await response.json();
    onSuccess(data.url);
  } catch (err: any) {
    onError(err.message);
  }
}

export function FormCrearEmpresa({
  setOpenModalCreate,
  onSuccess,
}: FormCrearEmpresaProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [token, setToken] = useState<string>("");
  const { getToken } = useAuth();
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [isSubmiting, setIsSubmiting] = useState<boolean>(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
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

  useEffect(() => {
    const fetchToken = async () => {
      const token = await getToken();
      if (token) setToken(token);
    };
    fetchToken();
  }, []);

  useEffect(() => {
    async function fetchDepartamentos() {
      const res = await getDepartamentos();
      const data = await res.json();
      setDepartamentos(data);
    }
    fetchDepartamentos();
  }, []);

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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmiting(true);
    try {
      const nombreDpto =
        departamentos.find((d) => d.id.toString() === values.departamento)
          ?.name || "";
      const nombreCiud =
        ciudades.find((c) => c.id.toString() === values.ciudad)?.name || "";

      const EmpresaPayload = {
        nit: values.nit,
        razonSocial: values.razonSocial.toUpperCase(),
        nombreComercial: values.nombreComercial.toUpperCase(),
        direccion: values.direccion.toUpperCase(),
        telefono: values.telefono,
        departamento: nombreDpto.toUpperCase(),
        ciudad: nombreCiud.toUpperCase(),
        correo: values.correo.toUpperCase(),
        logoUrl: values.logoUrl,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/empresa/create`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(EmpresaPayload),
        }
      );

      if (response.ok) {
        toast({ title: "Empresa creada con éxito", duration: 1000 });
        onSuccess?.();
        setOpenModalCreate(false);
      } else {
        toast({ title: "Error al crear la empresa", variant: "destructive" });
      }
    } catch (error) {
      console.error("❌ Error al crear la empresa:", error);
    } finally {
      setIsSubmiting(false);
    }
  };

  return (
    <div>
      {isSubmiting && <Loading title="Creando Empresa" />}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-3 gap-3">
            <FormField
              name="nit"
              control={form.control}
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
              name="razonSocial"
              control={form.control}
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
              name="nombreComercial"
              control={form.control}
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
              name="direccion"
              control={form.control}
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
              name="telefono"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="departamento"
              control={form.control}
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
              name="ciudad"
              control={form.control}
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

            <FormField
              name="correo"
              control={form.control}
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
              name="logoUrl"
              control={form.control}
              render={({ field }) => (
                <FormItem className="col-span-1">
                  <FormLabel>Logo de la Empresa</FormLabel>
                  <FormControl>
                    {photoUploaded && field.value ? (
                      <div className="text-sm">✅ Logo cargado</div>
                    ) : (
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && token) {
                            subirLogoEmpresa(
                              file,
                              token,
                              (url) => {
                                field.onChange(url);
                                setPhotoUploaded(true);
                                toast({ title: "Logo cargado correctamente" });
                              },
                              (errMsg) => {
                                toast({
                                  title: "Error al subir logo",
                                  description: errMsg,
                                  variant: "destructive",
                                });
                              }
                            );
                          }
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
            <Button type="submit" disabled={isSubmiting || !photoUploaded}>
              Crear Empresa
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
