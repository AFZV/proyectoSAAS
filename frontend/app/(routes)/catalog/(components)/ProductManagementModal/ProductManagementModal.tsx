// (components)/ProductManagementModal/ProductManagementModal.tsx
"use client";

import React, { useState, useEffect } from "react";
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
  Filter,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { formatValue } from "@/utils/FormartValue";
import type { ProductoBackend, Categoria } from "../../types/catalog.types";

interface ProductManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated?: () => void;
}

interface EditingProduct {
  id: string;
  nombre: string;
  precioCompra: number;
  precioVenta: number;
  categoriaId: string;
}

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

  // ✅ NUEVO: Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // 10 productos por página

  const { getToken } = useAuth();
  const { toast } = useToast();

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // ✅ NUEVO: Reset página cuando cambian filtros
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
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ MODIFICADO: Filtrar productos y aplicar paginación
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

  // ✅ NUEVO: Cálculos de paginación
  const totalPages = Math.ceil(productosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const productosEnPagina = productosFiltrados.slice(startIndex, endIndex);

  // Iniciar edición
  const startEditing = (producto: ProductoBackend) => {
    setEditingProduct({
      id: producto.id,
      nombre: producto.nombre,
      precioCompra: producto.precioCompra,
      precioVenta: producto.precioVenta,
      categoriaId: producto.categoriaId,
    });
    setEditErrors({});
  };

  // Cancelar edición
  const cancelEditing = () => {
    setEditingProduct(null);
    setEditErrors({});
  };

  // Validar formulario
  const validateForm = (data: EditingProduct): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!data.nombre.trim()) {
      errors.nombre = "El nombre es requerido";
    }

    if (data.precioCompra <= 0) {
      errors.precioCompra = "El precio de compra debe ser mayor a 0";
    }

    if (data.precioVenta <= 0) {
      errors.precioVenta = "El precio de venta debe ser mayor a 0";
    }

    if (data.precioVenta <= data.precioCompra) {
      errors.precioVenta =
        "El precio de venta debe ser mayor al precio de compra";
    }

    if (!data.categoriaId) {
      errors.categoriaId = "La categoría es requerida";
    }

    return errors;
  };

  // Guardar cambios
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
      if (!token) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/productos/update/${editingProduct.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nombre: editingProduct.nombre,
            precioCompra: editingProduct.precioCompra,
            precioVenta: editingProduct.precioVenta,
            categoriaId: editingProduct.categoriaId,
          }),
        }
      );

      if (response.ok) {
        toast({
          title: "Producto actualizado",
          description: "Los cambios se guardaron correctamente",
        });

        // Actualizar el producto en la lista local
        setProductos((prevProductos) =>
          prevProductos.map((p) =>
            p.id === editingProduct.id ? { ...p, ...editingProduct } : p
          )
        );

        setEditingProduct(null);
        onProductUpdated?.();
      } else {
        throw new Error("Error al actualizar producto");
      }
    } catch (error) {
      console.error("Error updating product:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el producto",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUpdate(null);
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
        // Actualizar el estado en la lista local
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
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

              {/* ✅ MODIFICADO: Resumen con info de paginación */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  Mostrando {startIndex + 1}-
                  {Math.min(endIndex, productosFiltrados.length)} de{" "}
                  {productosFiltrados.length} productos
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
            <CardContent className="p-0 h-full overflow-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Precio Compra</TableHead>
                      <TableHead>Precio Venta</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* ✅ MODIFICADO: Usar productosEnPagina en lugar de productosFiltrados */}
                    {productosEnPagina.map((producto) => (
                      <TableRow key={producto.id}>
                        {/* Nombre del producto */}
                        <TableCell className="min-w-[200px]">
                          {editingProduct?.id === producto.id ? (
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
                                  editErrors.nombre ? "border-red-500" : ""
                                }`}
                              />
                              {editErrors.nombre && (
                                <p className="text-xs text-red-500 mt-1">
                                  {editErrors.nombre}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <img
                                src={
                                  producto.imagenUrl ||
                                  "/placeholder-product.png"
                                }
                                alt={producto.nombre}
                                className="w-8 h-8 object-cover rounded"
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
                                  editErrors.precioVenta ? "border-red-500" : ""
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
                              // Botones de guardar/cancelar
                              <>
                                <Button
                                  size="sm"
                                  onClick={saveChanges}
                                  disabled={isLoadingUpdate === producto.id}
                                  className="bg-green-500 hover:bg-green-600"
                                >
                                  {isLoadingUpdate === producto.id ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                  ) : (
                                    <Save className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEditing}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              // Botones de editar/cambiar estado
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
              )}

              {/* ✅ MODIFICADO: Mensaje cuando no hay productos en la página actual */}
              {!isLoading && productosEnPagina.length === 0 && (
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
            </CardContent>
          </Card>

          {/* ✅ NUEVO: Controles de paginación */}
          {totalPages > 1 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1}-
                    {Math.min(endIndex, productosFiltrados.length)} de{" "}
                    {productosFiltrados.length} productos
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      Primera
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>

                    <span className="px-3 py-1 text-sm font-medium">
                      Página {currentPage} de {totalPages}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Última
                    </Button>
                  </div>
                </div>
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
