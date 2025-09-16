"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  Edit3,
  Save,
  X,
  Search,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Camera,
  Trash2,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { formatValue } from "@/utils/FormartValue";
import type {
  ProductoBackend,
  Categoria,
  EditingProduct,
  ProductManagementModalProps,
} from "./ProductManagementModal.types";

export function ProductManagementModal({
  isOpen,
  onClose,
  onProductUpdated,
}: ProductManagementModalProps) {
  // Estados principales
  const [productos, setProductos] = useState<ProductoBackend[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUpdate, setIsLoadingUpdate] = useState<string | null>(null);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");
  const [filterEstado, setFilterEstado] = useState<string>("all");

  // Estados de edición
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(
    null
  );
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Nuevo estado para manejar la imagen temporal
  const [tempImageFile, setTempImageFile] = useState<File | null>(null);
  const [tempImagePreview, setTempImagePreview] = useState<string | null>(null);
  // estados nuevos
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  ///estados para pdfurl
  const [tempPdfFile, setTempPdfFile] = useState<File | null>(null);
  const [originalManifiestoUrl, setOriginalManifiestoUrl] = useState<
    string | null
  >(null);
  const [manifiestoRemoved, setManifiestoRemoved] = useState(false); // usuario marcó quitar PDF

  // al iniciar edición
  const startEditing = (producto: ProductoBackend) => {
    setEditingProduct({
      id: producto.id,
      nombre: producto.nombre,
      precioCompra: producto.precioCompra,
      precioVenta: producto.precioVenta,
      categoriaId: producto.categoriaId,
      imagenUrl: producto.imagenUrl || "", // mantiene UI
      manifiestoUrl: producto.manifiestoUrl ?? "", // 👈
    });
    setOriginalImageUrl(producto.imagenUrl || null); // <-- guarda original
    setOriginalManifiestoUrl(producto.manifiestoUrl ?? null); // 👈
    setEditErrors({});
    setTempImageFile(null);
    setTempImagePreview(null);
    setTempPdfFile(null); // 👈
    setManifiestoRemoved(false);
  };

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const { getToken } = useAuth();
  const { toast } = useToast();

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // Reset página cuando cambian filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategoria, filterEstado]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      const [productosRes, categoriasRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/productos/empresa`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/productos/categoria/empresa`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
      ]);

      if (productosRes.ok && categoriasRes.ok) {
        const productosData = await productosRes.json();
        const categoriasData = await categoriasRes.json();

        setProductos(productosData.productos || []);
        setCategorias(categoriasData.categorias || []);
      }
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar productos y aplicar paginación
  const productosFiltrados = productos.filter((producto) => {
    const matchSearch = producto.nombre
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchCategoria =
      filterCategoria === "all" || producto.categoriaId === filterCategoria;
    const matchEstado =
      filterEstado === "all" || producto.estado === filterEstado;

    return matchSearch && matchCategoria && matchEstado;
  });

  // Cálculos de paginación
  const totalPages = Math.ceil(productosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const productosEnPagina = productosFiltrados.slice(startIndex, endIndex);

  // Iniciar edición (ACTUALIZADO)

  // Cancelar edición
  const cancelEditing = () => {
    setEditingProduct(null);
    setEditErrors({});
    setIsUploadingImage(false);
    setTempImageFile(null);
    setTempImagePreview(null);
  };

  // Validar formulario (ACTUALIZADO para requerir imagen)
  const validateForm = (data: EditingProduct): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!data.nombre.trim()) errors.nombre = "El nombre es requerido";
    if (data.precioCompra <= 0)
      errors.precioCompra = "El precio de compra debe ser mayor a 0";
    if (data.precioVenta <= 0)
      errors.precioVenta = "El precio de venta debe ser mayor a 0";
    if (data.precioVenta <= data.precioCompra) {
      errors.precioVenta =
        "El precio de venta debe ser mayor al precio de compra";
    }
    if (!data.categoriaId) errors.categoriaId = "La categoría es requerida";

    // Solo exigir imagen si NO hay original y NO se subió una nueva
    if (!originalImageUrl && !tempImageFile && !data.imagenUrl) {
      errors.imagenUrl = "La imagen del producto es requerida";
    }

    return errors;
  };

  // Función para subir imagen a Cloudinary (IGUAL QUE EN CREAR PRODUCTO)
  const uploadImageToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("imagen", file);

    const token = await getToken();
    if (!token) throw new Error("No hay token de autorización");

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/hetzner-storage/upload-product`, //aca
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al subir imagen");
    }

    const data = await response.json(); // { url: string }
    return data.url;
  };
  // Sube el manifiesto (PDF) de un producto
  const uploadManifiestoPdf = async (
    file: File,
    productoId: string
  ): Promise<{ url: string; key: string }> => {
    if (!file) throw new Error("No se ha seleccionado ningún archivo");
    if (file.type !== "application/pdf") {
      throw new Error("Solo se permiten archivos PDF");
    }

    const token = await getToken();
    if (!token) throw new Error("No hay token de autorización");

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/productos/${productoId}/manifiesto`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // ¡No seteamos Content-Type manualmente!
        },
        body: formData,
      }
    );

    if (!response.ok) {
      // intenta parsear JSON de error, si no, usa texto
      let detail = "";
      try {
        const err = await response.json();
        detail = err?.message || JSON.stringify(err);
      } catch {
        detail = await response.text();
      }
      throw new Error(
        `Error al subir manifiesto: ${response.status} - ${detail}`
      );
    }

    // El backend retorna { url, key }
    const data = await response.json();
    return { url: data.url as string, key: data.key as string };
  };

  // Manejar selección de archivo de imagen (IGUAL QUE EN CREAR PRODUCTO)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Solo se permiten archivos de imagen",
        variant: "destructive",
      });
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen debe ser menor a 5MB",
        variant: "destructive",
      });
      return;
    }

    // Crear preview inmediato
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setTempImagePreview(base64);
    };
    reader.readAsDataURL(file);

    // Guardar el archivo para subirlo después
    setTempImageFile(file);

    toast({
      title: "Imagen seleccionada",
      description: "La imagen se subirá al guardar los cambios",
    });
  };

  // Selección de PDF
  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Error",
        description: "Solo se permiten archivos PDF",
        variant: "destructive",
      });
      return;
    }
    // 10MB máx (ajusta si quieres)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "El PDF debe ser menor a 10MB",
        variant: "destructive",
      });
      return;
    }

    setTempPdfFile(file);
    setManifiestoRemoved(false); // si estaba marcado quitar, lo desmarcamos
    toast({ title: "PDF seleccionado", description: file.name });
  };

  // Quitar PDF (marcar para remover)
  const removePdf = () => {
    setTempPdfFile(null);
    setManifiestoRemoved(true);
    if (editingProduct) {
      setEditingProduct({ ...editingProduct, manifiestoUrl: "" });
    }
    toast({
      title: "Manifiesto removido",
      description: "Se eliminará el PDF al guardar",
      variant: "destructive",
    });
  };

  // Remover imagen (ACTUALIZADO para DTO requerido)
  const removeImage = () => {
    setTempImageFile(null);
    setTempImagePreview(null);
    if (editingProduct) {
      setEditingProduct({
        ...editingProduct,
        imagenUrl: "", // ✅ Vacío en lugar de undefined
      });
    }
    toast({
      title: "Imagen removida",
      description: "Se usará una imagen por defecto al guardar",
      variant: "destructive",
    });
  };

  // Guardar cambios (MISMA ESTRATEGIA QUE CREAR PRODUCTO)
  const saveChanges = async () => {
    if (!editingProduct) return;

    const errors = validateForm(editingProduct);
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setIsLoadingUpdate(editingProduct.id);

    try {
      const token = await getToken();
      if (!token) throw new Error("No hay token de autorización");

      // 3.1 Subir imagen nueva si hay
      let uploadedUrl: string | undefined;
      if (tempImageFile) {
        setIsUploadingImage(true);
        uploadedUrl = await uploadImageToCloudinary(tempImageFile);
        setIsUploadingImage(false);
      }
      let manifiestoUploadedUrl: string | undefined;

      // 3.2 Decidir si enviar imagenUrl
      // - Nueva imagen: usar uploadedUrl
      // - Sin imagen original y sin nueva: usar placeholder
      // - Si el usuario borró la imagen (imagenUrl === "" y había original): usar placeholder
      // - En cualquier otro caso: NO enviar imagenUrl (para conservar la existente)
      let imagenUrlToSend: string | undefined;
      if (tempPdfFile) {
        const { url } = await uploadManifiestoPdf(
          tempPdfFile,
          editingProduct.id
        );
        manifiestoUploadedUrl = url;
      }
      let manifiestoUrlToSend: string | null | undefined = undefined;
      if (manifiestoUploadedUrl) {
        manifiestoUrlToSend = manifiestoUploadedUrl; // string
      } else if (manifiestoRemoved) {
        manifiestoUrlToSend = null; // limpiar en BDD
      }

      if (uploadedUrl) {
        imagenUrlToSend = encodeURI(uploadedUrl);
      } else if (!originalImageUrl && !editingProduct.imagenUrl) {
        imagenUrlToSend = "https://via.placeholder.com/400x400?text=Sin+Imagen";
      } else if (originalImageUrl && editingProduct.imagenUrl === "") {
        // interpretamos que el usuario quitó la imagen existente
        imagenUrlToSend = "https://via.placeholder.com/400x400?text=Sin+Imagen";
      } // else: undefined → no tocar imagen en backend

      // 3.3 Construir payload sin pisar imagen si no corresponde
      const baseData = {
        nombre: editingProduct.nombre.trim(),
        precioCompra: Number(editingProduct.precioCompra),
        precioVenta: Number(editingProduct.precioVenta),
        categoriaId: editingProduct.categoriaId,
      } as Record<string, unknown>;

      const updateData =
        imagenUrlToSend !== undefined
          ? { ...baseData, imagenUrl: imagenUrlToSend }
          : baseData;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/productos/update/${editingProduct.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Error del servidor: ${response.status} - ${errorText}`
        );
      }

      toast({
        title: "Producto actualizado",
        description: "Los cambios se guardaron correctamente",
      });

      // 3.4 Actualizar lista local sin perder imagen existente
      setProductos((prev) =>
        prev.map((p) => {
          if (p.id !== editingProduct.id) return p;
          const next: ProductoBackend = { ...p, ...baseData } as any;
          if (imagenUrlToSend !== undefined) next.imagenUrl = imagenUrlToSend;
          if (manifiestoUrlToSend !== undefined)
            next.manifiestoUrl = manifiestoUrlToSend as any;
          return next;
        })
      );

      // limpiar
      setEditingProduct(null);
      setTempImageFile(null);
      setTempImagePreview(null);
      setOriginalImageUrl(null);
      setTempPdfFile(null);
      setOriginalManifiestoUrl(null);
      setManifiestoRemoved(false);
      onProductUpdated?.();
    } catch (error) {
      console.error("❌ Error completo:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el producto",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUpdate(null);
      setIsUploadingImage(false);
    }
  };

  // Cambiar estado del producto
  const toggleProductStatus = async (productoId: string) => {
    setIsLoadingUpdate(productoId);
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/productos/update/${productoId}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setProductos((prevProductos) =>
          prevProductos.map((p) =>
            p.id === productoId
              ? { ...p, estado: p.estado === "activo" ? "inactivo" : "activo" }
              : p
          )
        );

        toast({
          title: "Estado actualizado",
          description: "El estado del producto se cambió correctamente",
        });

        onProductUpdated?.();
      } else {
        throw new Error("Error al cambiar estado");
      }
    } catch (error) {
      console.error("Error toggling status:", error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del producto",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUpdate(null);
    }
  };

  // Obtener nombre de categoría
  const getCategoryName = (categoriaId: string) => {
    return (
      categorias.find((c) => c.idCategoria === categoriaId)?.nombre ||
      "Sin categoría"
    );
  };

  // Obtener stock total
  const getTotalStock = (producto: ProductoBackend) => {
    return (
      producto.inventario?.reduce(
        (total, inv) => total + (inv.stockActual || 0),
        0
      ) || 0
    );
  };

  // Función para obtener la imagen a mostrar (ACTUALIZADA)
  const getImageToShow = (producto: ProductoBackend) => {
    if (editingProduct?.id === producto.id) {
      // Si estamos editando este producto
      if (tempImagePreview) {
        // Si hay una nueva imagen seleccionada, mostrar preview
        return tempImagePreview;
      } else if (editingProduct.imagenUrl && editingProduct.imagenUrl !== "") {
        // Si no hay nueva imagen, mostrar la actual (si existe y no está vacía)
        return editingProduct.imagenUrl;
      } else {
        // Si no hay imagen nueva ni existente
        return "/placeholder-product.png";
      }
    }
    // Para productos no en edición, mostrar imagen actual o placeholder
    return producto.imagenUrl && producto.imagenUrl !== ""
      ? producto.imagenUrl
      : "/placeholder-product.png";
  };

  // Componente de paginación
  const PaginationControls = () => {
    if (totalPages <= 1) return null;

    const getVisiblePages = () => {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];

      for (
        let i = Math.max(2, currentPage - delta);
        i <= Math.min(totalPages - 1, currentPage + delta);
        i++
      ) {
        range.push(i);
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, "...");
      } else {
        rangeWithDots.push(1);
      }

      rangeWithDots.push(...range);

      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push("...", totalPages);
      } else {
        rangeWithDots.push(totalPages);
      }

      return rangeWithDots;
    };
    const uploadManifiestoPdf = async (
      productoId: string,
      file: File
    ): Promise<{ url: string; key: string }> => {
      const token = await getToken();
      if (!token) throw new Error("No hay token de autorización");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/productos/${productoId}/manifiesto`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Error al subir manifiesto: ${res.status} - ${err}`);
      }
      // backend retorna { url, key }
      return res.json();
    };

    return (
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="text-sm text-muted-foreground">
          Mostrando {startIndex + 1}-
          {Math.min(endIndex, productosFiltrados.length)} de{" "}
          {productosFiltrados.length} productos ({itemsPerPage} por página)
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="hidden sm:flex"
          >
            Primera
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="hidden sm:flex items-center gap-1">
            {getVisiblePages().map((page, index) => (
              <React.Fragment key={index}>
                {page === "..." ? (
                  <span className="px-2">
                    <MoreHorizontal className="w-4 h-4" />
                  </span>
                ) : (
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page as number)}
                    className="w-10"
                  >
                    {page}
                  </Button>
                )}
              </React.Fragment>
            ))}
          </div>

          <span className="sm:hidden px-3 py-1 text-sm font-medium">
            {currentPage} / {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="hidden sm:flex"
          >
            Última
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Gestión de Productos
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Búsqueda */}
                <div>
                  <Label>Buscar producto</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Nombre del producto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Filtro por categoría */}
                <div>
                  <Label>Categoría</Label>
                  <Select
                    value={filterCategoria}
                    onValueChange={setFilterCategoria}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
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

                {/* Filtro por estado */}
                <div>
                  <Label>Estado</Label>
                  <Select value={filterEstado} onValueChange={setFilterEstado}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span>{productosFiltrados.length} productos encontrados</span>
                <span>
                  Página {currentPage} de {totalPages}
                </span>
                {(searchTerm ||
                  filterCategoria !== "all" ||
                  filterEstado !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterCategoria("all");
                      setFilterEstado("all");
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabla de productos */}
          <Card className="flex-1 overflow-hidden">
            <CardContent className="p-0 h-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <div className="h-[500px] overflow-auto">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10 border-b">
                        <TableRow>
                          <TableHead className="min-w-[250px]">
                            Producto
                          </TableHead>
                          <TableHead className="min-w-[120px]">
                            Categoría
                          </TableHead>
                          <TableHead className="min-w-[120px]">
                            Precio Compra
                          </TableHead>
                          <TableHead className="min-w-[120px]">
                            Precio Venta
                          </TableHead>
                          <TableHead className="min-w-[80px]">Stock</TableHead>
                          <TableHead className="min-w-[100px]">
                            Estado
                          </TableHead>
                          <TableHead className="min-w-[120px]">
                            Acciones
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productosEnPagina.map((producto) => (
                          <TableRow key={producto.id}>
                            {/* Producto con funcionalidad de imagen COMPLETA */}
                            <TableCell className="min-w-[250px]">
                              {editingProduct?.id === producto.id ? (
                                <div className="space-y-3">
                                  {/* Nombre del producto */}
                                  <div>
                                    <Input
                                      value={editingProduct.nombre}
                                      onChange={(e) =>
                                        setEditingProduct({
                                          ...editingProduct,
                                          nombre: e.target.value,
                                        })
                                      }
                                      className={`text-sm ${
                                        editErrors.nombre
                                          ? "border-red-500"
                                          : ""
                                      }`}
                                      placeholder="Nombre del producto"
                                    />
                                    {editErrors.nombre && (
                                      <p className="text-xs text-red-500 mt-1">
                                        {editErrors.nombre}
                                      </p>
                                    )}
                                    {editErrors.imagenUrl && (
                                      <p className="text-xs text-red-500 mt-1">
                                        {editErrors.imagenUrl}
                                      </p>
                                    )}
                                  </div>

                                  {/* Upload/Cambio de imagen COMPLETO */}
                                  <div className="space-y-2">
                                    <Label className="text-xs">
                                      Imagen del producto
                                    </Label>

                                    <div className="flex items-center gap-3">
                                      {/* Preview de la imagen */}
                                      <img
                                        src={getImageToShow(producto)}
                                        alt="Producto"
                                        className="w-16 h-16 object-cover rounded border"
                                      />

                                      {/* Controles */}
                                      <div className="flex flex-col gap-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            document
                                              .getElementById(
                                                `file-input-${editingProduct.id}`
                                              )
                                              ?.click()
                                          }
                                          disabled={isUploadingImage}
                                          className="text-blue-600 hover:text-blue-700"
                                        >
                                          {isUploadingImage ? (
                                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                                          ) : (
                                            <Camera className="w-4 h-4 mr-1" />
                                          )}
                                          {tempImageFile
                                            ? "Cambiar"
                                            : "Seleccionar"}
                                        </Button>

                                        {/* Solo mostrar botón quitar si hay imagen nueva seleccionada */}
                                        {tempImageFile && (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={removeImage}
                                            className="text-red-600 hover:text-red-700"
                                          >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Quitar nueva
                                          </Button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Input oculto para seleccionar archivos */}
                                    <input
                                      id={`file-input-${editingProduct.id}`}
                                      type="file"
                                      accept="image/*"
                                      onChange={handleFileSelect}
                                      className="hidden"
                                      disabled={isUploadingImage}
                                    />

                                    {/* Indicador de estado */}
                                    {tempImageFile && (
                                      <p className="text-xs text-blue-600 mt-1">
                                        📄 Nueva imagen seleccionada:{" "}
                                        {tempImageFile.name}
                                      </p>
                                    )}
                                    {isUploadingImage && (
                                      <p className="text-xs text-orange-600 mt-1">
                                        📤 Subiendo imagen...
                                      </p>
                                    )}
                                    {/* --- Bloque PDF Manifiesto --- */}
                                    <div className="space-y-2">
                                      <Label className="text-xs">
                                        Manifiesto (PDF)
                                      </Label>

                                      <div className="flex items-start gap-3">
                                        {/* Vista actual: link o estado */}
                                        <div className="min-w-[180px] text-sm">
                                          {tempPdfFile ? (
                                            <div className="text-blue-700">
                                              📄 Nuevo PDF:{" "}
                                              <span className="font-medium">
                                                {tempPdfFile.name}
                                              </span>
                                            </div>
                                          ) : originalManifiestoUrl &&
                                            !manifiestoRemoved ? (
                                            <a
                                              href={originalManifiestoUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-blue-600 underline"
                                            >
                                              Ver PDF actual
                                            </a>
                                          ) : (
                                            <span className="text-muted-foreground">
                                              Sin PDF
                                            </span>
                                          )}
                                          {manifiestoRemoved && (
                                            <div className="text-xs text-orange-600 mt-1">
                                              Se eliminará al guardar
                                            </div>
                                          )}
                                        </div>

                                        {/* Controles */}
                                        <div className="flex flex-col gap-2">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              document
                                                .getElementById(
                                                  `pdf-input-${editingProduct.id}`
                                                )
                                                ?.click()
                                            }
                                            disabled={isUploadingImage}
                                            className="text-blue-600 hover:text-blue-700"
                                          >
                                            {tempPdfFile
                                              ? "Cambiar PDF"
                                              : "Seleccionar PDF"}
                                          </Button>

                                          {/* Botón quitar (si hay PDF nuevo o existente) */}
                                          {(tempPdfFile ||
                                            (originalManifiestoUrl &&
                                              !manifiestoRemoved)) && (
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={removePdf}
                                              className="text-red-600 hover:text-red-700"
                                            >
                                              <Trash2 className="w-4 h-4 mr-1" />
                                              Quitar PDF
                                            </Button>
                                          )}
                                        </div>
                                      </div>

                                      {/* Input oculto para seleccionar PDF */}
                                      <input
                                        id={`pdf-input-${editingProduct.id}`}
                                        type="file"
                                        accept="application/pdf"
                                        onChange={handlePdfSelect}
                                        className="hidden"
                                        disabled={isUploadingImage}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <img
                                    src={getImageToShow(producto)}
                                    alt={producto.nombre}
                                    className="w-10 h-10 object-cover rounded border"
                                  />
                                  <span className="font-medium">
                                    {producto.nombre}
                                  </span>
                                </div>
                              )}
                            </TableCell>

                            {/* Categoría */}
                            <TableCell>
                              {editingProduct?.id === producto.id ? (
                                <div>
                                  <Select
                                    value={editingProduct.categoriaId}
                                    onValueChange={(value) =>
                                      setEditingProduct({
                                        ...editingProduct,
                                        categoriaId: value,
                                      })
                                    }
                                  >
                                    <SelectTrigger
                                      className={`w-full ${
                                        editErrors.categoriaId
                                          ? "border-red-500"
                                          : ""
                                      }`}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
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
                                  {editErrors.categoriaId && (
                                    <p className="text-xs text-red-500 mt-1">
                                      {editErrors.categoriaId}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <Badge variant="secondary">
                                  {getCategoryName(producto.categoriaId)}
                                </Badge>
                              )}
                            </TableCell>

                            {/* Precio Compra */}
                            <TableCell>
                              {editingProduct?.id === producto.id ? (
                                <div>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={editingProduct.precioCompra}
                                    onChange={(e) =>
                                      setEditingProduct({
                                        ...editingProduct,
                                        precioCompra:
                                          parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className={`text-sm ${
                                      editErrors.precioCompra
                                        ? "border-red-500"
                                        : ""
                                    }`}
                                  />
                                  {editErrors.precioCompra && (
                                    <p className="text-xs text-red-500 mt-1">
                                      {editErrors.precioCompra}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-orange-600 font-medium">
                                  {formatValue(producto.precioCompra)}
                                </span>
                              )}
                            </TableCell>

                            {/* Precio Venta */}
                            <TableCell>
                              {editingProduct?.id === producto.id ? (
                                <div>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={editingProduct.precioVenta}
                                    onChange={(e) =>
                                      setEditingProduct({
                                        ...editingProduct,
                                        precioVenta:
                                          parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className={`text-sm ${
                                      editErrors.precioVenta
                                        ? "border-red-500"
                                        : ""
                                    }`}
                                  />
                                  {editErrors.precioVenta && (
                                    <p className="text-xs text-red-500 mt-1">
                                      {editErrors.precioVenta}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-green-600 font-bold">
                                  {formatValue(producto.precioVenta)}
                                </span>
                              )}
                            </TableCell>

                            {/* Stock */}
                            <TableCell>
                              <span
                                className={`font-medium ${
                                  getTotalStock(producto) > 10
                                    ? "text-green-600"
                                    : getTotalStock(producto) > 0
                                    ? "text-yellow-600"
                                    : "text-red-600"
                                }`}
                              >
                                {getTotalStock(producto)}
                              </span>
                            </TableCell>

                            {/* Estado */}
                            <TableCell>
                              <Badge
                                variant={
                                  producto.estado === "activo"
                                    ? "default"
                                    : "secondary"
                                }
                                className={
                                  producto.estado === "activo"
                                    ? "bg-green-500"
                                    : "bg-gray-500"
                                }
                              >
                                {producto.estado === "activo"
                                  ? "Activo"
                                  : "Inactivo"}
                              </Badge>
                            </TableCell>

                            {/* Acciones */}
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {editingProduct?.id === producto.id ? (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={saveChanges}
                                      disabled={
                                        isLoadingUpdate === producto.id ||
                                        isUploadingImage
                                      }
                                      className="bg-green-500 hover:bg-green-600"
                                    >
                                      {isLoadingUpdate === producto.id ||
                                      isUploadingImage ? (
                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                      ) : (
                                        <Save className="w-4 h-4" />
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={cancelEditing}
                                      disabled={
                                        isLoadingUpdate === producto.id ||
                                        isUploadingImage
                                      }
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => startEditing(producto)}
                                      disabled={!!editingProduct}
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        toggleProductStatus(producto.id)
                                      }
                                      disabled={
                                        isLoadingUpdate === producto.id ||
                                        !!editingProduct
                                      }
                                      className={
                                        producto.estado === "activo"
                                          ? "text-red-600 hover:text-red-700"
                                          : "text-green-600 hover:text-green-700"
                                      }
                                    >
                                      {isLoadingUpdate === producto.id ? (
                                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                      ) : producto.estado === "activo" ? (
                                        <EyeOff className="w-4 h-4" />
                                      ) : (
                                        <Eye className="w-4 h-4" />
                                      )}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Mensaje cuando no hay productos */}
                  {productosEnPagina.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <Package className="w-12 h-12 mb-2 opacity-50" />
                      <p>No se encontraron productos</p>
                      {(searchTerm ||
                        filterCategoria !== "all" ||
                        filterEstado !== "all") && (
                        <p className="text-sm">Intenta ajustar los filtros</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Controles de paginación */}
          {productosFiltrados.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <PaginationControls />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
