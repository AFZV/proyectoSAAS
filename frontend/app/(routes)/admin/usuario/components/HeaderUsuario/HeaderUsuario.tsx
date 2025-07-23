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
import { Edit3, Plus, UserCheck, Users, UserX } from "lucide-react";
import React, { useEffect, useState } from "react";
import { FormCrearUsuario } from "../FormCrearUsuario/FormCrearUsuario";
import { FormUpdateEmpresa } from "../../../empresa/components/FormUpdateEmpresa/FormUpdateEmpresa";
import { FormUpdateUsuario } from "../FormUpdateUsuario";

export function HeaderUsuario() {
  const [openCreateModal, setOpenCreateModal] = useState<boolean>(false);
  const [openUpdateModal, setOpenUpdateModal] = useState<boolean>(false);
  const [totalUsuarios, setTotalUsuarios] = useState<number>(0);
  const [UsuariosActivos, setUsuariosActivos] = useState<number>(0);
  const [UsuariosInactivos, setUsuariosInactivos] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const { getToken } = useAuth();

  // Cargar datos del dashboard (solo lo que necesitas)
  const fetchData = async () => {
    try {
      const token = await getToken();
      const dashboardRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuario/resumen`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json();
        setTotalUsuarios(dashboardData.total);
        setUsuariosActivos(dashboardData.activos);
        setUsuariosInactivos(dashboardData.inactivos);
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="border-b bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header principal */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                USUARIOS
              </h1>
              <p className="text-sm text-muted-foreground">
                Gestiona Los Usuarios Registrados
              </p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setOpenUpdateModal(true)}
              className="flex items-center space-x-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-800"
            >
              <Edit3 className="w-4 h-4" />
              <span>Actualizar Usuario</span>
            </Button>

            <Button
              onClick={() => setOpenCreateModal(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Usuario</span>
            </Button>
          </div>
        </div>

        {/* Stats rápidas - 3 tarjetas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tarjeta 1: Total Usuarios (del dashboard) */}
          <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-blue-100 dark:border-blue-800 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Usuarios
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {loading ? "..." : String(totalUsuarios)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Activos en la Plataforma
                </p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Clientes Activos */}
          <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-green-100 dark:border-green-800 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Usuarios Activos
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {loading ? "..." : String(UsuariosActivos)}
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

          {/* Tarjeta 3: Usuarios Inactivos */}
          <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-red-100 dark:border-red-800 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Usuarios Inactivos
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {loading ? "..." : String(UsuariosInactivos)}
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

      {/* Modal para crear usuario */}
      <Dialog open={openCreateModal} onOpenChange={setOpenCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                <Plus className="w-3 h-3 text-white" />
              </div>
              <span>Crear Usuario</span>
            </DialogTitle>
            <DialogDescription>Registra un nuevo usuario</DialogDescription>
          </DialogHeader>
          <FormCrearUsuario
            setOpenModalUsuarioCreate={setOpenCreateModal}
            refetchUsuarios={fetchData}
          />
        </DialogContent>
      </Dialog>

      {/* Modal para actualizar usuario */}
      <Dialog open={openUpdateModal} onOpenChange={setOpenUpdateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                <Edit3 className="w-3 h-3 text-white" />
              </div>
              <span>Actualizar Usuario</span>
            </DialogTitle>
            <DialogDescription>
              Busca y actualiza la información de un Usuario existente
              <br />
              <span className="text-xs text-blue-600 mt-1 block">
                💡 Puedes probar buscando cualquier correo para ver cómo
                funciona la búsqueda
              </span>
            </DialogDescription>
          </DialogHeader>
          <FormUpdateUsuario setOpenModalUpdate={setOpenUpdateModal} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
