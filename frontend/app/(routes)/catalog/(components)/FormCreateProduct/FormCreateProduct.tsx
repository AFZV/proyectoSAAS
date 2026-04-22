"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Package, Camera, Trash2 } from "lucide-react";
import type { Categoria } from "../../types/catalog.types";

type Slot = "image1" | "image2" | "image3";

const formSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  precioCompra: z.number().min(0, "El precio de compra debe ser mayor a 0"),
  precioVenta: z.number().min(0, "El precio de venta debe ser mayor a 0"),
  categoriaId: z.string().min(1, "Debe seleccionar una categoría"),
  // Opcionales
  referencia: z.string().optional(),
  unidadesPorBulto: z.number().optional(),
  pesoPorBulto: z.number().optional(),
  cubicajePorBulto: z.number().optional(),
  precioCompraExterior: z.number().optional(),
  monedaCompraExterior: z.string().optional(),
});

const categoriaSchema = z.object({
  nombre: z.string().min(2).max(50),
});

interface FormCreateProductProps {
  onSuccess: () => void;
}

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
    defaultValues: { nombre: "" },
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
        },
      );
      if (!response.ok) throw new Error((await response.json()).message);
      const data = await response.json();
      toast({ title: "Categoría creada", description: data.categoria.nombre });
      onCategoriaCreated(data.categoria);
      categoriaForm.reset();
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
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
          className="flex items-center gap-1"
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
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: Papelería, Ferretería..."
                      maxLength={50}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creando..." : "Crear"}
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Estados de imágenes por slot
  const [imageFiles, setImageFiles] = useState<Record<Slot, File | null>>({
    image1: null,
    image2: null,
    image3: null,
  });
  const [imagePreviews, setImagePreviews] = useState<
    Record<Slot, string | null>
  >({
    image1: null,
    image2: null,
    image3: null,
  });
  const [imageUrls, setImageUrls] = useState<Record<Slot, string | null>>({
    image1: null,
    image2: null,
    image3: null,
  });

  const { getToken } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      precioCompra: 0,
      precioVenta: 0,
      categoriaId: "",
      referencia: "",
      unidadesPorBulto: undefined,
      pesoPorBulto: undefined,
      cubicajePorBulto: undefined,
      precioCompraExterior: undefined,
      monedaCompraExterior: "",
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
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.ok) {
        const data = await response.json();
        setCategorias(data.categorias);
      }
    } catch (error) {
      console.error("Error al cargar categorías:", error);
    }
  };

  const handleCategoriaCreated = (nuevaCategoria: Categoria) => {
    setCategorias((prev) => [...prev, nuevaCategoria]);
    form.setValue("categoriaId", nuevaCategoria.idCategoria);
  };

  const formatearNumero = (value: string): number => {
    const cleaned = value.replace(/[^\d.]/g, "");
    return cleaned === "" ? 0 : parseFloat(cleaned) || 0;
  };

  // Seleccionar imagen por slot — genera preview inmediato
  const handleFileSelectSlot = (
    e: React.ChangeEvent<HTMLInputElement>,
    slot: Slot,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Solo se permiten imágenes",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen debe ser menor a 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreviews((prev) => ({
        ...prev,
        [slot]: event.target?.result as string,
      }));
    };
    reader.readAsDataURL(file);
    setImageFiles((prev) => ({ ...prev, [slot]: file }));
  };

  const removeImageSlot = (slot: Slot) => {
    setImageFiles((prev) => ({ ...prev, [slot]: null }));
    setImagePreviews((prev) => ({ ...prev, [slot]: null }));
    setImageUrls((prev) => ({ ...prev, [slot]: null }));
  };

  // Subir imagen al bucket por slot
  const uploadImageSlot = async (
    file: File,
    slot: Slot,
    productoId: string,
  ): Promise<string> => {
    const formData = new FormData();
    formData.append("imagen", file);
    formData.append("productoId", productoId);
    formData.append("slot", slot);

    const token = await getToken();
    if (!token) throw new Error("No hay token");

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/hetzner-storage/upload-product`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      },
    );

    if (!response.ok)
      throw new Error(
        (await response.json()).message || "Error al subir imagen",
      );
    return (await response.json()).url;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      const token = await getToken();

      // 1. Crear producto sin imágenes primero
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/productos/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...values,
            // imagenUrl vacío — se llenará con image1 si la suben
          }),
        },
      );

      if (!response.ok)
        throw new Error(
          (await response.json()).message || "Error al crear producto",
        );
      const data = await response.json();
      const productoId = data.producto.id;

      // 2. Subir imágenes si hay y actualizar producto
      const imagenesPayload: { slot: Slot; url: string }[] = [];
      let imagenUrlPrincipal: string | undefined;

      setIsUploadingImage(true);
      for (const slot of ["image1", "image2", "image3"] as Slot[]) {
        const file = imageFiles[slot];
        if (file) {
          const url = await uploadImageSlot(file, slot, productoId);
          imagenesPayload.push({ slot, url });
          if (slot === "image1") imagenUrlPrincipal = encodeURI(url);
        }
      }
      setIsUploadingImage(false);

      // 3. Si hay imágenes, actualizar producto con urls
      if (imagenesPayload.length > 0) {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/productos/update/${productoId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              ...values,
              ...(imagenUrlPrincipal && { imagenUrl: imagenUrlPrincipal }),
              imagenes: imagenesPayload,
            }),
          },
        );
      }

      toast({
        title: "Producto creado",
        description: `${data.producto.nombre} agregado al catálogo`,
      });

      // Reset
      form.reset();
      setImageFiles({ image1: null, image2: null, image3: null });
      setImagePreviews({ image1: null, image2: null, image3: null });
      setImageUrls({ image1: null, image2: null, image3: null });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error al crear producto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nombre */}
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem className="col-span-full">
                <FormLabel>Nombre del Producto *</FormLabel>
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

          {/* Precio compra */}
          <FormField
            control={form.control}
            name="precioCompra"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio de Compra *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="text"
                      placeholder="0"
                      className="pl-8"
                      value={field.value === 0 ? "" : field.value.toString()}
                      onChange={(e) =>
                        field.onChange(formatearNumero(e.target.value))
                      }
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Precio venta */}
          <FormField
            control={form.control}
            name="precioVenta"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio de Venta *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="text"
                      placeholder="0"
                      className="pl-8"
                      value={field.value === 0 ? "" : field.value.toString()}
                      onChange={(e) =>
                        field.onChange(formatearNumero(e.target.value))
                      }
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Categoría */}
          <FormField
            control={form.control}
            name="categoriaId"
            render={({ field }) => (
              <FormItem className="col-span-full">
                <FormLabel>Categoría *</FormLabel>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categorias.map((cat) => (
                          <SelectItem
                            key={cat.idCategoria}
                            value={cat.idCategoria}
                          >
                            {cat.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <CreateCategoriaModal
                    onCategoriaCreated={handleCategoriaCreated}
                  />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* ── Imágenes del carrusel ── */}
          <div className="col-span-full space-y-2">
            <Label>
              Imágenes del producto{" "}
              <span className="text-muted-foreground text-xs">(opcional)</span>
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {(["image1", "image2", "image3"] as Slot[]).map((slot, idx) => {
                const preview = imagePreviews[slot];
                const label = idx === 0 ? "Principal" : `Imagen ${idx + 1}`;
                return (
                  <div key={slot} className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {label}
                    </span>
                    <div className="w-20 h-20 border-2 border-dashed rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                      {preview ? (
                        <img
                          src={preview}
                          alt={label}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera className="w-6 h-6 text-muted-foreground opacity-40" />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2 text-blue-600"
                      onClick={() =>
                        document.getElementById(`create-file-${slot}`)?.click()
                      }
                      disabled={isUploadingImage}
                    >
                      {imageFiles[slot] ? "Cambiar" : "Subir"}
                    </Button>
                    {imageFiles[slot] && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2 text-red-500"
                        onClick={() => removeImageSlot(slot)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Quitar
                      </Button>
                    )}
                    <input
                      id={`create-file-${slot}`}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileSelectSlot(e, slot)}
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              La imagen principal se usará como portada en el catálogo
            </p>
          </div>

          {/* ── Campos logística (opcionales) ── */}
          <div className="col-span-full">
            <p className="text-sm font-medium mb-3">
              Datos de logística{" "}
              <span className="text-muted-foreground text-xs">(opcional)</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="referencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referencia</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Código proveedor" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unidadesPorBulto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidades por bulto</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ej: 12"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pesoPorBulto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso por bulto (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Ej: 8.5"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cubicajePorBulto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cubicaje por bulto (m³)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="Ej: 0.05"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="precioCompraExterior"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio compra exterior</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Ej: 12.50"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monedaCompraExterior"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moneda exterior</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD — Dólar</SelectItem>
                          <SelectItem value="EUR">EUR — Euro</SelectItem>
                          <SelectItem value="CNY">CNY — Yuan</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* Resumen financiero */}
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
                <span className="text-muted-foreground">Margen:</span>
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

        {/* Botón submit */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting || isUploadingImage}
            className="min-w-[140px] bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
          >
            {isSubmitting || isUploadingImage ? "Creando..." : "Crear Producto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
