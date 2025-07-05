"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormCreateProduct } from "../FormCreateProduct";

export function HeaderCatalog() {
  const [openModalCreate, setOpenModalCreate] = useState(false);

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