///
"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { CirclePlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function HeaderInvoices() {
  const [openModalCreate, setOpenModalCreate] = useState(false);
  return (
    <div className="flex justify-between items-center ">
      <h2>Lista de Pedidos</h2>
      <Dialog open={openModalCreate} onOpenChange={setOpenModalCreate}>
        <DialogTrigger asChild>
          <Button>Crear Pedido</Button>
        </DialogTrigger>
        <DialogContent className="sm: max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Crear Factura</DialogTitle>
            <DialogDescription>Crear Nueva Pedido</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
