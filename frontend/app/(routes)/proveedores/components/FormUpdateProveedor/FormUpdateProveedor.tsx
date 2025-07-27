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
import { Search, RefreshCw, Edit3 } from "lucide-react";
import { Loading } from "@/components/Loading";

const searchSchema = z.object({
  identificacion: z.string().min(3, "Ingrese la identificación del proveedor"),
});

const formSchema = z.object({
  idProveedor: z.string().uuid().optional(),
  identificacion: z.string().min(3).max(20),
  razonsocial: z.string().min(2).max(50),
  telefono: z.string().min(5).max(15),
  direccion: z.string().min(5).max(100),
});

type Proveedor = z.infer<typeof formSchema>;
export function FormUpdateProveedor({
  setOpenModalUpdate,
}: {
  setOpenModalUpdate: (v: boolean) => void;
}) {
  const [step, setStep] = useState<"search" | "edit">("search");
  const [proveedorActual, setProveedorActual] = useState<Proveedor | null>(
    null
  );
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const onSearch = async (values: z.infer<typeof searchSchema>) => {
    setIsSearching(true);
    try {
      const token = await getToken();
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/proveedores/getbyid/${values.identificacion}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const proveedor: Proveedor = res.data;
      setProveedorActual(proveedor);

      editForm.reset({
        identificacion: proveedor.identificacion,
        razonsocial: proveedor.razonsocial,
        direccion: proveedor.direccion,
        telefono: proveedor.telefono,
      });

      setStep("edit");
      toast({ title: "Proveedor encontrado" });
    } catch (error) {
      toast({ title: "Proveedor no encontrado", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const onUpdate = async (values: z.infer<typeof formSchema>) => {
    if (!proveedorActual) return;
    setIsUpdating(true);
    try {
      const token = await getToken();
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/proveedores/${proveedorActual.idProveedor}`,
        values,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: "Proveedor actualizado correctamente" });
      setOpenModalUpdate(false);
      router.refresh();
    } catch (error) {
      toast({
        title: "Error al actualizar proveedor",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const volverABuscar = () => {
    setStep("search");
    setProveedorActual(null);
    searchForm.reset();
    editForm.reset();
  };

  if (isUpdating) return <Loading title="Actualizando proveedor..." />;

  return (
    <div className="space-y-6">
      {step === "search" ? (
        <Form {...searchForm}>
          <form
            onSubmit={searchForm.handleSubmit(onSearch)}
            className="space-y-4"
          >
            <FormField
              control={searchForm.control}
              name="identificacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Identificación del Proveedor</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ej: 900123456" />
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
                "Buscar Proveedor"
              )}
            </Button>
          </form>
        </Form>
      ) : (
        <Form {...editForm}>
          <form
            onSubmit={editForm.handleSubmit(onUpdate)}
            className="space-y-4"
          >
            <FormField
              control={editForm.control}
              name="identificacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Identificación</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled
                      className="bg-muted cursor-not-allowed"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={editForm.control}
              name="razonsocial"
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
              control={editForm.control}
              name="telefono"
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
              control={editForm.control}
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
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={volverABuscar}>
                Buscar Otro
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Actualizar Proveedor
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
