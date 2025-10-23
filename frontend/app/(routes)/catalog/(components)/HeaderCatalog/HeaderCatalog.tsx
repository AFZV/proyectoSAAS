"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit3,
  Package,
  RefreshCw,
  DownloadIcon,
  Tags,
  ImageIcon,
} from "lucide-react";
import { ProductManagementModal } from "../ProductManagementModal/ProductManagementModal";
import { FormCreateProduct } from "../FormCreateProduct/FormCreateProduct";
import { useAuth } from "@clerk/nextjs";
import { Loading } from "@/components/Loading";
import { useToast } from "@/hooks/use-toast";
import { catalogService } from "../../services/catalog.services";

interface HeaderCatalogProps {
  onProductUpdated?: () => void;
  totalProductos?: number;
  productosEnStock?: number;
  onToggleSelectionMode?: () => void;
  isSelectionMode?: boolean;
}

type Categoria = { idCategoria: string; nombre: string };

export function HeaderCatalog({
  onProductUpdated,
  totalProductos = 0,
  productosEnStock = 0,
  onToggleSelectionMode,
  isSelectionMode = false,
}: HeaderCatalogProps) {
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // ⬇️ nuevo: estado para modal de categoría
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaIdSel, setCategoriaIdSel] = useState<string>("");
  const [loadingCategorias, setLoadingCategorias] = useState(false);

  const [loading, setLoading] = useState<boolean>(false);
  const { getToken } = useAuth();
  const { toast } = useToast();

  const handleProductUpdated = () => {
    onProductUpdated?.();
  };

  const handleProductCreated = () => {
    setIsCreateModalOpen(false);
    handleProductUpdated();
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // ⬇️ carga de categorías al abrir el modal (una sola vez)
  // tu carga que "ya funciona" (la dejo igual)
  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      const token = await getToken();
      if (token) {
        const categoriasData = await catalogService.getCategorias(token);
        setCategorias(categoriasData); // <- ya es Categoria[]
      }
    } catch (error) {
      console.error("Error al cargar categorías:", error);
      setCategorias([]);
    }
  };

  const generarPdf = async () => {
    const token = await getToken();
    if (!token) {
      toast({
        title: "Sin acceso",
        description: "Inicia sesión de nuevo.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const r = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/productos/catalogo/link`,

        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      let body: any = null;
      let raw = "";
      try {
        body = await r.json();
      } catch {
        raw = await r.text();
      }

      if (!r.ok) {
        const msg = Array.isArray(body?.message)
          ? body.message.join(", ")
          : body?.message || raw || r.statusText;

        if (r.status === 401 || r.status === 403) {
          toast({
            title: "No autorizado",
            description: "Necesitas rol ADMIN para generar el catálogo.",
            variant: "destructive",
          });
        } else if (r.status === 400) {
          toast({
            title: "No hay productos",
            description: msg || "No hay productos activos con stock.",
            variant: "destructive",
          });
        } else {
          toast({
            title: `Error ${r.status}`,
            description: msg,
            variant: "destructive",
          });
        }
        return;
      }

      const { url } = body as { url: string };
      window.open(url, "_blank", "noopener,noreferrer");
      await navigator.clipboard.writeText(url);
      toast({
        title: "✅ Link copiado",
        description: "El enlace del catálogo está en tu portapapeles.",
      });
    } catch (e: any) {
      toast({
        title: "Error al generar enlace",
        description: e?.message ?? "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generarPdfCategoria = async (categoriaId: string) => {
    const token = await getToken();
    if (!token) {
      toast({
        title: "Sin acceso",
        description: "Inicia sesión de nuevo.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const r = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/productos/catalogo/link/categoria/${categoriaId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let body: any = null;
      let raw = "";
      try {
        body = await r.json();
      } catch {
        raw = await r.text();
      }

      if (!r.ok) {
        const msg = Array.isArray(body?.message)
          ? body.message.join(", ")
          : body?.message || raw;
        toast({
          title: `Error ${r.status}`,
          description: msg,
          variant: "destructive",
        });
        return;
      }

      const { url } = body as { url: string };
      window.open(url, "_blank", "noopener,noreferrer");
      await navigator.clipboard.writeText(url);
      toast({
        title: "✅ Link copiado",
        description: "El enlace del catálogo está en tu portapapeles.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading title="Cargando PDF" />;

  return (
    <>
      <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white shadow-lg rounded-2xl mx-4 sm:mx-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-6 gap-6">
          {/* Lado izquierdo - Título y estadísticas */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 flex-1">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">CATÁLOGO</h1>
                <p className="text-blue-100 text-sm">
                  Gestiona tus productos de forma profesional
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">
                  {totalProductos}
                </div>
                <div className="text-xs text-blue-100 font-medium">
                  Productos
                </div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-green-300">
                  {productosEnStock}
                </div>
                <div className="text-xs text-blue-100 font-medium">
                  En Stock
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-wrap gap-3 w-full lg:w-auto justify-start lg:justify-end">
            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 border border-white/20 hover:border-white/30 transition-all duration-200 w-full sm:w-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>

            <Button
              onClick={() => setIsManagementModalOpen(true)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 border border-white/20 hover:border-white/30 transition-all duration-200 w-full sm:w-auto"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Editar Productos</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 border-0 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Crear Producto</span>
            </Button>

            {/* ⬇️ botón PDF general */}
            <Button
              onClick={generarPdf}
              className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-blue-500/25 w-full sm:w-auto"
            >
              <DownloadIcon className="w-4 h-4" />
              Generar PDF
            </Button>

            {/* ⬇️ nuevo botón: PDF por categoría */}
            <Button
              onClick={() => {
                setCategoriaIdSel("");
                setIsCategoryModalOpen(true);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-blue-500/25 w-full sm:w-auto"
            >
              <Tags className="w-4 h-4" />
              PDF por categoría
            </Button>

            {/* ⬇️ nuevo botón: Seleccionar Fotos */}
            <Button
              onClick={onToggleSelectionMode}
              className={`flex items-center gap-2 shadow-lg w-full sm:w-auto ${
                isSelectionMode
                  ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 hover:shadow-red-500/25"
                  : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-blue-500/25"
              } text-white`}
            >
              <ImageIcon className="w-4 h-4" />
              {isSelectionMode ? "Cancelar Selección" : "Seleccionar Fotos"}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal gestión de productos */}
      <ProductManagementModal
        isOpen={isManagementModalOpen}
        onClose={() => setIsManagementModalOpen(false)}
        onProductUpdated={handleProductUpdated}
      />

      {/* Modal crear producto */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-6 h-6 text-blue-600" />
              Crear Nuevo Producto
            </DialogTitle>
            <DialogDescription>
              Completa la información para agregar un nuevo producto al catálogo
            </DialogDescription>
          </DialogHeader>
          <FormCreateProduct onSuccess={handleProductCreated} />
        </DialogContent>
      </Dialog>

      {/* ⬇️ nuevo: Modal seleccionar categoría */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tags className="w-5 h-5 text-emerald-600" />
              Generar catálogo por categoría
            </DialogTitle>
            <DialogDescription>
              Selecciona la categoría para generar y compartir el enlace del
              PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label className="text-sm font-medium">Categoría</label>
            <select
              className="w-full border rounded-md p-2 text-sm"
              value={categoriaIdSel}
              onChange={(e) => setCategoriaIdSel(e.target.value)}
            >
              <option value="" disabled>
                {categorias.length
                  ? "Selecciona una categoría"
                  : "No hay categorías disponibles"}
              </option>
              {categorias.map((c) => (
                <option key={c.idCategoria} value={c.idCategoria}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsCategoryModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                disabled={!categoriaIdSel || loading}
                onClick={async () => {
                  await generarPdfCategoria(categoriaIdSel); // ⬅️ tu función existente
                  setIsCategoryModalOpen(false);
                }}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Generar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
