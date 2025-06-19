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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UploadButton } from "@/utils/UploadThing";
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
  useEffect(() => {
    const fetchToken = async () => {
      const token = await getToken();
      if (token) setToken(token);
      return;
    };
    fetchToken();
  }, []);

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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmiting(true);
    console.log("📤 Enviando al backend:", values);
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
      if (token) {
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
          console.log("payload enviado el backend:", EmpresaPayload);

          toast({ title: "Empresa creada con éxito", duration: 1000 });
          onSuccess?.();
          setOpenModalCreate(false);
        } else {
          toast({
            title: "Error al crear la empresa",
            variant: "destructive",
          });
        }
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
    </div>
  );
}
