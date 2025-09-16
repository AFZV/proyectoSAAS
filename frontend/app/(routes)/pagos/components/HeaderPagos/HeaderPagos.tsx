"use client";
import React, { useState } from "react";
import { FormCreateFacturaProveedor } from "../FormCreateFaacturaProveedor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export type HeaderPagosProps = {
  stats: {
    vencimientosProximos: number;
    totalPorPagar: number;
  };
};

export function HeaderPagos({ stats }: HeaderPagosProps) {
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const { totalPorPagar, vencimientosProximos } = stats;

  return (
    <div className="bg-white shadow p-4 rounded-lg mb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Gestión de Pagos</h1>

        {/* Botón para abrir el modal */}
        <Dialog open={openCreateModal} onOpenChange={setOpenCreateModal}>
          <DialogTrigger asChild>
            <Button
              onClick={() => setOpenCreateModal(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva factura proveedor
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                  <Plus className="w-3 h-3 text-white" />
                </div>
                <span>Crear factura de proveedor</span>
              </DialogTitle>
              <DialogDescription>
                Registra una nueva factura de proveedor
              </DialogDescription>
            </DialogHeader>

            <FormCreateFacturaProveedor
              setOpenModalCreate={setOpenCreateModal}
              // onSuccess={refreshStats}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex space-x-4">
        <div className="flex-1 bg-blue-100 p-4 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-800">
            Vencimientos Próximos
          </h2>
          <p className="text-3xl font-bold text-blue-900">
            {vencimientosProximos}
          </p>
        </div>

        <div className="flex-1 bg-green-100 p-4 rounded-lg">
          <h2 className="text-lg font-semibold text-green-800">
            Total por Pagar
          </h2>
          <p className="text-3xl font-bold text-green-900">
            ${Number(totalPorPagar || 0).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
