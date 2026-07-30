"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus } from "lucide-react";
import { CrearOrdenCompraModal } from "../CrearOrdenCompra/CrearOrdenCompraModal";

export function HeaderOrdenesCompra() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-between px-4 py-4 border-b bg-background">
      <div className="flex items-center gap-3">
        <ClipboardList className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-xl font-bold">Órdenes de Compra</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona las órdenes de compra a proveedores
          </p>
        </div>
      </div>

      <Button
        onClick={() => setOpen(true)}
        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
      >
        <Plus className="w-4 h-4 mr-2" />
        Nueva OC
      </Button>

      <CrearOrdenCompraModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
