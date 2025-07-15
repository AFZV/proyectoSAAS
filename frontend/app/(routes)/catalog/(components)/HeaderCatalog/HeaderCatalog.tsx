"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, DownloadIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormCreateProduct } from "../FormCreateProduct";
import { useAuth } from "@clerk/nextjs";
import { Loading } from "@/components/Loading";

export function HeaderCatalog() {
  const [openModalCreate, setOpenModalCreate] = useState(false);
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
    <div className="border-b bg-card">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Gestión de Productos</h2>
            <p className="text-sm text-muted-foreground">
              Administra el catálogo de productos de la empresa
            </p>
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
        </div>
      </div>
    </div>
  );
}
