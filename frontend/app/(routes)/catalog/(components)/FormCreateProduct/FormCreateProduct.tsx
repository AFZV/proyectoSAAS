"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { UploadButton } from "@/utils/UploadThing";
import { Plus, Package } from "lucide-react";
import type { Categoria } from "../../types/catalog.types";

const formSchema = z.object({
  nombre: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50),
  precioCompra: z.number().min(0, "El precio de compra debe ser mayor a 0"),
  precioVenta: z.number().min(0, "El precio de venta debe ser mayor a 0"),
  imagenUrl: z.string().url("URL de imagen inválida"),
  categoriaId: z.string().min(1, "Debe seleccionar una categoría"),
});

const categoriaSchema = z.object({
  nombre: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(30, "El nombre no puede exceder 30 caracteres"),
});

interface FormCreateProductProps {
  onSuccess: () => void;
}

// Componente para crear nueva categoría
function CreateCategoriaModal({
  onCategoriaCreated,
}: {
  onCategoriaCreated: (categoria: Categoria) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getToken } = useAuth();
  const { toast } = useToast();

  const categoriaForm = useForm<z.infer<typeof categoriaSchema>>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: {
      nombre: "",
    },
  });

  const onSubmitCategoria = async (values: z.infer<typeof categoriaSchema>) => {
    try {
      setIsSubmitting(true);
      const token = await getToken();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/productos/categoria/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(values),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al crear categoría");
      }

      const data = await response.json();

      toast({
        title: "Categoría creada exitosamente",
        description: `${data.categoria.nombre} ha sido agregada`,
      });

      onCategoriaCreated(data.categoria);
      categoriaForm.reset();
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error al crear categoría",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex items-center gap-1 hover:bg-blue-50 hover:border-blue-300"
        >
          <Plus className="w-3 h-3" />
          Nueva Categoría
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Crear Nueva Categoría
          </DialogTitle>
          <DialogDescription>
            Agrega una nueva categoría para organizar tus productos
          </DialogDescription>
        </DialogHeader>

        <Form {...categoriaForm}>
          <form
            onSubmit={categoriaForm.handleSubmit(onSubmitCategoria)}
            className="space-y-4"
          >
            <FormField
              control={categoriaForm.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Categoría</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: Papelería, Ferretería, Hogar..."
                      maxLength={30}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value.length}/30 caracteres
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {isSubmitting ? "Creando..." : "Crear Categoría"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function FormCreateProduct({ onSuccess }: FormCreateProductProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { getToken } = useAuth();
  const { toast } = useToast();

  const handleImageUpload = async (
    file: File,
    setUrl: (url: string) => void,
    setUploaded: (v: boolean) => void
  ) => {
    const formData = new FormData();
    formData.append("imagen", file);

    try {
      const token = await getToken();
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

      const data = await response.json(); // { url: string }
      setUrl(data.url);
      setUploaded(true);

      toast({
        title: "Imagen cargada",
        description: "La imagen se subió correctamente",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error al subir imagen",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      precioCompra: 0,
      precioVenta: 0,
      imagenUrl: "",
      categoriaId: "",
    },
  });

  // Cargar categorías al montar el componente
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

      if (response.ok) {
        const data = await response.json();
        setCategorias(data.categorias);
      }
    } catch (error) {
      console.error("Error al cargar categorías:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las categorías",
        variant: "destructive",
      });
    }
  };

  // Función para formatear números mientras el usuario escribe
  const formatearNumero = (value: string): number => {
    // Remover todo lo que no sea dígito o punto decimal
    const cleaned = value.replace(/[^\d.]/g, "");
    return cleaned === "" ? 0 : parseFloat(cleaned) || 0;
  };

  // Callback cuando se crea una nueva categoría
  const handleCategoriaCreated = (nuevaCategoria: Categoria) => {
    setCategorias((prev) => [...prev, nuevaCategoria]);
    // Seleccionar automáticamente la nueva categoría
    form.setValue("categoriaId", nuevaCategoria.idCategoria);
    toast({
      title: "Categoría agregada",
      description: "La nueva categoría ha sido seleccionada automáticamente",
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      const token = await getToken();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/productos/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(values),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al crear producto");
      }

      const data = await response.json();

      toast({
        title: "Producto creado exitosamente",
        description: `${data.producto.nombre} ha sido agregado al catálogo`,
      });

      onSuccess();
    } catch (error: any) {
      console.error("Error:", error);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nombre del producto */}
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem className="col-span-full">
                <FormLabel>Nombre del Producto</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Ej: Cuaderno Norma 100 hojas"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Precio de compra */}
          <FormField
            control={form.control}
            name="precioCompra"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio de Compra *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="text"
                      placeholder="0"
                      className="pl-8"
                      value={field.value === 0 ? "" : field.value.toString()}
                      onChange={(e) => {
                        const value = formatearNumero(e.target.value);
                        field.onChange(value);
                      }}
                      onBlur={() => {
                        // Si está vacío al perder el foco, establecer en 0
                        if (field.value === 0) {
                          field.onChange(0);
                        }
                      }}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Precio al que compras el producto
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Precio de venta */}
          <FormField
            control={form.control}
            name="precioVenta"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio de Venta *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="text"
                      placeholder="0"
                      className="pl-8"
                      value={field.value === 0 ? "" : field.value.toString()}
                      onChange={(e) => {
                        const value = formatearNumero(e.target.value);
                        field.onChange(value);
                      }}
                      onBlur={() => {
                        // Si está vacío al perder el foco, establecer en 0
                        if (field.value === 0) {
                          field.onChange(0);
                        }
                      }}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Precio al que vendes el producto
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Categoría con botón para crear nueva */}
          <FormField
            control={form.control}
            name="categoriaId"
            render={({ field }) => (
              <FormItem className="col-span-full">
                <FormLabel>Categoría</FormLabel>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categorias.map((categoria) => (
                          <SelectItem
                            key={categoria.idCategoria}
                            value={categoria.idCategoria}
                          >
                            {categoria.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <CreateCategoriaModal
                    onCategoriaCreated={handleCategoriaCreated}
                  />
                </div>
                <FormDescription>
                  {categorias.length === 0
                    ? "No hay categorías. Crea una nueva categoría primero."
                    : "Selecciona una categoría existente o crea una nueva"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="imagenUrl"
            render={({ field }) => (
              <FormItem className="col-span-full">
                <FormLabel>Imagen del Producto</FormLabel>
                <FormControl>
                  <div className="space-y-4">
                    {photoUploaded && field.value ? (
                      <div className="flex items-center space-x-4">
                        <div className="w-20 h-20 border rounded-lg overflow-hidden">
                          <img
                            src={field.value}
                            alt="Producto"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-600">
                            ✅ Imagen cargada correctamente
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPhotoUploaded(false);
                              field.onChange("");
                            }}
                          >
                            Cambiar imagen
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Input
                          type="file"
                          accept="image/*"
                          className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-400 transition-colors p-2"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(
                                file,
                                field.onChange,
                                setPhotoUploaded
                              );
                            }
                          }}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Sube una imagen en formato JPG o PNG
                        </p>
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Resumen de ganancias */}
        {form.watch("precioCompra") > 0 && form.watch("precioVenta") > 0 && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Resumen financiero</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">
                  Ganancia unitaria:
                </span>
                <p className="font-semibold text-green-600">
                  $
                  {(
                    form.watch("precioVenta") - form.watch("precioCompra")
                  ).toLocaleString("es-CO")}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">
                  Margen de ganancia:
                </span>
                <p className="font-semibold">
                  {(
                    ((form.watch("precioVenta") - form.watch("precioCompra")) /
                      form.watch("precioVenta")) *
                    100
                  ).toFixed(1)}
                  %
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end space-x-4">
          <Button
            type="submit"
            disabled={isSubmitting || !photoUploaded}
            className="min-w-[120px] bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-blue-500/25"
          >
            {isSubmitting ? "Creando..." : "Crear Producto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
