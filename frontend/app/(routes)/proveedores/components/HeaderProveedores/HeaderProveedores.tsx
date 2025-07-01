"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@clerk/nextjs";
import { Edit3, Plus, Truck, UserCheck, UserX } from "lucide-react";
import React, { useEffect, useState } from "react";
import { FormCrearProveedor } from "../FormCrearProveedor";
import { FormUpdateProveedor } from "../FormUpdateProveedor";

export function HeaderProveedores() {
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const [totalProveedores, setTotalProveedores] = useState(0);
  const [proveedoresActivos, setProveedoresActivos] = useState(0);
  const [proveedoresInactivos, setProveedoresInactivos] = useState(0);
  const [loading, setLoading] = useState(true);

  const { getToken } = useAuth();

  const fetchData = async () => {
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/proveedores/summary`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      if (res.ok) {
        const data = await res.json();
        console.log("esto llega del backend :", data);
        setTotalProveedores(data.total);
        setProveedoresActivos(data.total);
        setProveedoresInactivos(data.inactivos);
      }
    } catch (error) {
      console.error("Error al cargar proveedores:", error);
    } finally {
      setLoading(false);
    }
  };
  console.log("esto llega del backend :", totalProveedores);
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="border-b bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                PROVEEDORES
              </h1>
              <p className="text-sm text-muted-foreground">
                Gestiona tus proveedores registrados
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setOpenUpdateModal(true)}
              className="flex items-center space-x-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-800"
            >
              <Edit3 className="w-4 h-4" />
              <span>Actualizar Proveedor</span>
            </Button>
            <Button
              onClick={() => setOpenCreateModal(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Proveedor</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-blue-100 dark:border-blue-800 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Proveedores
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {loading ? "..." : totalProveedores}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Registrados en el sistema
                </p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <Truck className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-green-100 dark:border-green-800 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Proveedores Activos
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {loading ? "..." : proveedoresActivos}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Estado: Activo
                </p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-red-100 dark:border-red-800 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Proveedores Inactivos
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {loading ? "..." : 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Estado: Inactivo
                </p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center">
                <UserX className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={openCreateModal} onOpenChange={setOpenCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                <Plus className="w-3 h-3 text-white" />
              </div>
              <span>Crear Proveedor</span>
            </DialogTitle>
            <DialogDescription>Registra un nuevo proveedor</DialogDescription>
          </DialogHeader>
          <FormCrearProveedor
            setOpenModalCreate={setOpenCreateModal}
            onSuccess={fetchData}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={openUpdateModal} onOpenChange={setOpenUpdateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                <Edit3 className="w-3 h-3 text-white" />
              </div>
              <span>Actualizar Proveedor</span>
            </DialogTitle>
            <DialogDescription>
              Busca y actualiza la información de un proveedor
            </DialogDescription>
          </DialogHeader>
          <FormUpdateProveedor setOpenModalUpdate={setOpenUpdateModal} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
