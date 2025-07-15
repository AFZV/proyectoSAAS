"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/nextjs";
import { Categoria } from "../../types/catalog.types";

const formSchema = z.object({
  nombre: z.string().min(2).max(50),
  precioCompra: z.number().min(0),
  precioVenta: z.number().min(0),
  categoriaId: z.string().min(1),
});

interface FormCreateProductProps {
  onSuccess: () => void;
}

export function FormCreateProduct({ onSuccess }: FormCreateProductProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getToken } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      precioCompra: 0,
      precioVenta: 0,
      categoriaId: "",
    },
  });

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/productos/categoria/empresa`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      setCategorias(data.categorias || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las categorías",
        variant: "destructive",
      });
    }
  };

  const formatearNumero = (value: string): number => {
    const cleaned = value.replace(/[^\d.]/g, "");
    return cleaned === "" ? 0 : parseFloat(cleaned) || 0;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      const token = await getToken();

      const formData = new FormData();
      formData.append("nombre", values.nombre);
      formData.append("precioCompra", values.precioCompra.toString());
      formData.append("precioVenta", values.precioVenta.toString());
      formData.append("categoriaId", values.categoriaId);
      if (selectedFile) {
        formData.append("imagen", selectedFile);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/productos/create`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al crear producto");
      }

      const data = await response.json();
      toast({
        title: "Producto creado",
        description: `${data.producto.nombre} ha sido agregado`,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error al crear producto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del producto</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ej: Cuaderno Norma" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="precioCompra"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio de compra</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    value={field.value === 0 ? "" : field.value.toString()}
                    onChange={(e) =>
                      field.onChange(formatearNumero(e.target.value))
                    }
                    placeholder="$"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="precioVenta"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio de venta</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    value={field.value === 0 ? "" : field.value.toString()}
                    onChange={(e) =>
                      field.onChange(formatearNumero(e.target.value))
                    }
                    placeholder="$"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="categoriaId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.idCategoria} value={cat.idCategoria}>
                      {cat.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>Imagen del producto</FormLabel>
          <FormControl>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setSelectedFile(file);
              }}
            />
          </FormControl>
          {selectedFile && (
            <FormDescription className="text-green-600">
              ✅ Archivo seleccionado: {selectedFile.name}
            </FormDescription>
          )}
        </FormItem>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creando..." : "Crear producto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
