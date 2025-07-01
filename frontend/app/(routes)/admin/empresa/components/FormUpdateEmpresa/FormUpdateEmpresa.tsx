"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { Search, RefreshCw, Edit3 } from "lucide-react";

import { getDepartamentos } from "@/lib/getDepartamentos";
import { getCiudades } from "@/lib/getCiudades";
import { Loading } from "@/components/Loading";
import { FormUpdateEmpresaProps } from "./FormUpdateEmpresa.types";

const searchSchema = z.object({
  nit: z.string().min(1, "Ingrese NIT para buscar"),
});

const formSchema = z.object({
  nit: z.string().min(2).max(10),
  razonSocial: z.string().min(2).max(50),
  nombreComercial: z.string().min(2).max(50),
  direccion: z.string().min(10).max(50),
  telefono: z.string().min(1).max(10),
  departamento: z.string().min(1),
  ciudad: z.string().min(1),
  correo: z.string().email("Correo inválido").max(50),
  logoUrl: z.string().url().optional(),
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
  nit: string;
  razonSocial: string;
  nombreComercial: string;
  direccion: string;
  telefono: string;
  departamento: string;
  ciudad: string;
  correo: string;
  logoUrl?: string;
  estado: string;
}

export function FormUpdateEmpresa({
  setOpenModalUpdate,
}: FormUpdateEmpresaProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [empresaActual, setEmpresaActual] = useState<Empresa | null>(null);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);

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
    async function fetchDepartamentos() {
      const res = await getDepartamentos();
      const data = await res.json();
      setDepartamentos(data);
    }
    fetchDepartamentos();
  }, []);

  useEffect(() => {
    const dep = editForm.watch("departamento");
    if (dep) {
      const dptoObj = departamentos.find((d) => d.name === dep);
      if (dptoObj) {
        getCiudades(String(dptoObj.id)).then(setCiudades);
      }
    } else {
      setCiudades([]);
    }
  }, [editForm.watch("departamento"), departamentos]);

  useEffect(() => {
    if (empresaActual) {
      editForm.reset({
        nit: empresaActual.nit,
        razonSocial: empresaActual.razonSocial,
        nombreComercial: empresaActual.nombreComercial,
        direccion: empresaActual.direccion,
        telefono: empresaActual.telefono,
        departamento: empresaActual.departamento,
        ciudad: empresaActual.ciudad,
        correo: empresaActual.correo,
        logoUrl: empresaActual.logoUrl,
      });
    }
  }, [empresaActual]);

  const onSearch = async (values: z.infer<typeof searchSchema>) => {
    setIsSearching(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/empresa/nit/${values.nit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error();

      const empresa = await res.json();
      setEmpresaActual({ ...empresa });
      toast({ title: "Empresa encontrada" });
    } catch {
      toast({ title: "Empresa no encontrada", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const onUpdate = async (values: z.infer<typeof formSchema>) => {
    if (!empresaActual) return;
    setIsUpdating(true);
    try {
      const token = await getToken();
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/empresa/edit/${empresaActual.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }
      );

      toast({ title: "Empresa actualizada exitosamente" });
      router.refresh();
      setOpenModalUpdate(false);
    } catch {
      toast({ title: "Error al actualizar empresa", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBack = () => {
    setEmpresaActual(null);
    setCiudades([]);
    editForm.reset();
    searchForm.reset();
  };

  if (isUpdating) return <Loading title="Actualizando Empresa..." />;

  return (
    <div className="space-y-6">
      {!empresaActual ? (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-center">
            Buscar Empresa por NIT
          </h3>
          <Form {...searchForm}>
            <form
              onSubmit={searchForm.handleSubmit(onSearch)}
              className="space-y-4"
            >
              <FormField
                control={searchForm.control}
                name="nit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIT</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: 12345678" />
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
                    Buscar Empresa
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Editar Empresa</h3>
            <Button variant="outline" onClick={handleBack}>
              Buscar Otra
            </Button>
          </div>
          <Form key={empresaActual.id} {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onUpdate)}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                {[
                  "nit",
                  "razonSocial",
                  "nombreComercial",
                  "direccion",
                  "telefono",
                  "correo",
                ].map((field) => (
                  <FormField
                    key={field}
                    control={editForm.control}
                    name={field as keyof z.infer<typeof formSchema>}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel>{field}</FormLabel>
                        <FormControl>
                          <Input {...formField} disabled={field === "nit"} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                <FormField
                  control={editForm.control}
                  name="departamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departamento</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full p-2 border rounded"
                        >
                          <option value="">Seleccione un departamento</option>
                          {departamentos.map((d) => (
                            <option key={d.id} value={d.name}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="ciudad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full p-2 border rounded"
                        >
                          <option value="">Seleccione una ciudad</option>
                          {ciudades.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
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
