"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormCrearRecibo } from "../formCrearRecaudo";
import { FileSpreadsheet } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DatePickerWithRange } from "../FormExportRecaudos";

export function HeaderRecaudos({
  user,
  onReciboCreado,
}: {
  user: string;
  onReciboCreado?: () => void;
}) {
  const [openModalCreate, setOpenModalCreate] = useState(false);
  const [openModalExport, setOpenModalExport] = useState(false);

  return (
    <div className="flex justify-between items-center">
      <h2>Lista de Cobros</h2>

      <TooltipProvider>
        <div className="flex gap-2 items-center">
          {/* Modal Crear Recibo */}
          <Dialog open={openModalCreate} onOpenChange={setOpenModalCreate}>
            <DialogTrigger asChild>
              <Button>Crear Recibo</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle>Crear Recibo</DialogTitle>
                <DialogDescription>Crear Recibo de Caja</DialogDescription>
              </DialogHeader>

              <FormCrearRecibo
                setOpenModalCreate={setOpenModalCreate}
                onSuccess={onReciboCreado} // 👈 se llama cuando se crea el recibo
              />
            </DialogContent>
          </Dialog>

          {/* Exportar (solo admin) */}
          {user === "admin" && (
            <Dialog open={openModalExport} onOpenChange={setOpenModalExport}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button>
                      <FileSpreadsheet />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Exportar</p>
                </TooltipContent>
              </Tooltip>

              <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                  <DialogTitle>Exportar</DialogTitle>
                  <DialogDescription>Exportar datos</DialogDescription>
                </DialogHeader>

                <DatePickerWithRange
                  onClose={() => setOpenModalExport(false)}
                  user={user}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}
