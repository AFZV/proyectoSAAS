"use client";

import React from "react";
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
import { CargarClientesPanel } from "./CargarClientesPanel";

export function CargarClientes() {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="rounded-2xl shadow-md p-6 bg-background border space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        Carga masiva de clientes
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
              link.href = "/modelos/clientes.xlsx"; // asegúrate de tener este archivo disponible
              link.download = "modelo_clientes.xlsx";
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
              Cargar clientes desde Excel
            </DialogTitle>
          </DialogHeader>
          <CargarClientesPanel onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
