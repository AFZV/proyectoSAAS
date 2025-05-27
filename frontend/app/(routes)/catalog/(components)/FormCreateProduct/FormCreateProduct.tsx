"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import axios from "axios";
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
import { Input } from "@/components/ui/input";
import { FormCreateProductProps } from "./FormCreateProduct.types";
import { useState, useEffect } from "react";
import { UploadButton } from "@/utils/UploadThing";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

const formSchema = z.object({
  nombre: z.string().min(2).max(50),
  precio: z.coerce.number().min(1),
  categoria: z.string().min(2).max(50),
  imagenUrl: z.string().url(),
  empresaId: z.string().uuid(), // ✅ Campo nuevo requerido
});

export function FormCreateProduct({
  setOpenModalCreate,
}: FormCreateProductProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const { userId } = useAuth();

  // ✅ Simulación: obtener empresaId del usuario actual desde el backend
  useEffect(() => {
    const fetchEmpresaId = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/usuario-actual`,
          {
            headers: {
              Authorization: userId,
            },
          }
        );
        setEmpresaId(res.data.empresaId);
      } catch (error) {
        toast({
          title: "No se pudo obtener la empresa",
          variant: "destructive",
        });
      }
    };

    fetchEmpresaId();
  }, [toast]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      precio: 0,
      categoria: "",
      imagenUrl: "",
      empresaId: "", // ✅ requerido por el modelo
    },
  });

  const { isValid } = form.formState;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/productos`, values);
      toast({ title: "Producto Creado" });
      //router.refresh();
      setOpenModalCreate(false);
    } catch (error) {
      toast({ title: "Algo salió mal", variant: "destructive" });
    }
  };

  // Actualiza empresaId apenas se obtiene
  useEffect(() => {
    if (empresaId) form.setValue("empresaId", empresaId);
  }, [empresaId, form]);

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input type="text" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="precio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Precio de venta"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Precio unitario o por docena
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full border rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecciona una categoría</option>
                      <option value="hogar">HOGAR</option>
                      <option value="papeleria">PAPELERIA</option>
                      <option value="ferreteria">FERRETERIA</option>
                      <option value="cacharro">CACHARRO</option>
                      <option value="otros">Otros</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="col-span-2">
              <FormField
                control={form.control}
                name="imagenUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Foto</FormLabel>
                    <FormControl>
                      {photoUploaded ? (
                        <p className="text-sm">Imagen cargada</p>
                      ) : (
                        <UploadButton
                          {...field}
                          endpoint="productImage"
                          className="bg-slate-600/20 text-slate-800 rounded-lg outline-dotted outline-3"
                          onClientUploadComplete={(res) => {
                            if (res && res.length > 0) {
                              form.setValue("imagenUrl", res[0].ufsUrl);
                              setPhotoUploaded(true);
                              toast({ title: "Foto cargada" });
                            }
                          }}
                          onUploadError={(error: Error) => {
                            toast({
                              title: "Error cargando foto",
                              content: String(error),
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
          </div>

          {/* Campo oculto para empresaId */}
          <input type="hidden" {...form.register("empresaId")} />

          <Button type="submit" disabled={!empresaId}>
            Crear
          </Button>
        </form>
      </Form>
    </div>
  );
}
