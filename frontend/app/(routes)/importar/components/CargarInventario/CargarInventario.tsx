"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { CargarInventarioPanel } from "./CargarInventarioPanel";

export function CargarInventario() {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <div className="rounded-2xl shadow-md p-6 bg-background border space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        Carga masiva de inventario
      </h2>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="text-foreground">
            Opciones
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem
            onClick={() => {
              const link = document.createElement("a");
              link.href = "/modelos/inventario.xlsx";
              link.download = "modelo_inventario.xlsx";
              link.click();
            }}
          >
            Descargar modelo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen(true)}>
            Cargar archivo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Cargar inventario desde Excel
            </DialogTitle>
          </DialogHeader>
          <CargarInventarioPanel onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
