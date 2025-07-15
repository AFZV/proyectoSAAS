// (components)/HeaderCatalog/HeaderCatalog.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, DownloadIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit3, Package, RefreshCw, Users } from "lucide-react";
import { ProductManagementModal } from "../ProductManagementModal/ProductManagementModal";
import { FormCreateProduct } from "../FormCreateProduct/FormCreateProduct"; // Tu componente existente

interface HeaderCatalogProps {
  onProductUpdated?: () => void;
  totalProductos?: number;
  productosEnStock?: number;
}
import { useAuth } from "@clerk/nextjs";
import { Loading } from "@/components/Loading";

export function HeaderCatalog({
  onProductUpdated,
  totalProductos = 0,
  productosEnStock = 0,
}: HeaderCatalogProps) {
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
  const { getToken } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);

  async function generarPdf() {
    const token = await getToken();
    if (!token) return "No tiene acceso";
    setLoading(true);
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/productos/catalogo/pdf`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.error("❌ Error al generar el PDF");
      return;
    }

    // ⚠️ Convertimos a blob (tipo archivo)
    const blob = await response.blob();

    // Creamos un enlace temporal para forzar la descarga
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "catalogo_productos.pdf";
    document.body.appendChild(a);
    a.click();

    // Limpiamos
    a.remove();
    window.URL.revokeObjectURL(url);
    setLoading(false);
  }
  if (loading) return <Loading title="Cargando PDF" />;

  return (
    <>
      <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white shadow-lg rounded-2xl mx-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-6">
          {/* Lado izquierdo - Título, descripción y estadísticas */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 flex-1">
            {/* Título y descripción */}
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

            {/* Estadísticas */}
            <div className="flex items-center gap-6 ml-0 lg:ml-8">
              {/* Total Productos */}
              <div className="text-center">
                <div className="text-3xl font-bold text-white">
                  {totalProductos}
                </div>
                <div className="text-xs text-blue-100 font-medium">
                  Productos
                </div>
              </div>

              {/* Productos En Stock */}
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

          <Button
            onClick={generarPdf}
            className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-blue-500/25"
          >
            <DownloadIcon className="w-4 h-4" />
            Generar PDF
          </Button>
          <Dialog open={openModalCreate} onOpenChange={setOpenModalCreate}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-blue-500/25">
                <Plus className="w-4 h-4" />
                Crear Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Producto</DialogTitle>
                <DialogDescription>
                  Agrega un nuevo producto al catálogo de la empresa
                </DialogDescription>
              </DialogHeader>
              <FormCreateProduct
                onSuccess={() => {
                  setOpenModalCreate(false);
                  // Aquí podríamos actualizar la lista de productos
                  window.location.reload(); // Por ahora recargamos la página
                }}
              />
            </DialogContent>
          </Dialog>
          {/* Lado derecho - Botones de acción */}
          <div className="flex items-center gap-3 mt-4 lg:mt-0 w-full lg:w-auto justify-end">
            {/* Botón Actualizar */}
            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 border border-white/20 hover:border-white/30 transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>

            {/* Botón Gestionar Clientes */}
            {/* <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 border border-white/20 hover:border-white/30 transition-all duration-200"
            >
              <Users className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Gestionar Clientes</span>
            </Button> */}

            {/* Botón Editar Productos */}
            <Button
              onClick={() => setIsManagementModalOpen(true)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 border border-white/20 hover:border-white/30 transition-all duration-200"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Editar Productos</span>
            </Button>

            {/* Botón Crear Producto - Destacado */}
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 border-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Crear Producto</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de gestión de productos */}
      <ProductManagementModal
        isOpen={isManagementModalOpen}
        onClose={() => setIsManagementModalOpen(false)}
        onProductUpdated={handleProductUpdated}
      />

      {/* Modal de crear producto - USANDO TU COMPONENTE EXISTENTE */}
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

          {/* Tu componente FormCreateProduct existente */}
          <FormCreateProduct onSuccess={handleProductCreated} />
        </DialogContent>
      </Dialog>
    </>
  );
}
