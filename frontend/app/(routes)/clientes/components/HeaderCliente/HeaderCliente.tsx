"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormCreateCliente } from "../FormCreateCliente";
import { FormUpdateCliente } from "../FormUpdateCliente";
import { Plus, Edit3, Users, TrendingUp, UserCheck, UserX } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

interface DashboardData {
  totalClientes: number;
  // otros campos del dashboard...
}

export default function HeaderCliente() {
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const [totalClientes, setTotalClientes] = useState(0);
  const [clientesActivos, setClientesActivos] = useState(0);
  const [clientesInactivos, setClientesInactivos] = useState(0);
  const [loading, setLoading] = useState(true);

  const { getToken } = useAuth();

  // Cargar datos del dashboard (solo lo que necesitas)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken();

        // 1. Traer totalClientes del dashboard
        const dashboardRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/dashboard/summary`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        if (dashboardRes.ok) {
          const dashboardData = await dashboardRes.json();
          setTotalClientes(dashboardData.totalClientes);
        }

        // 2. Traer lista de clientes para calcular activos/inactivos
        const clientesRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/clientes`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        if (clientesRes.ok) {
          const clientes = await clientesRes.json();
          const activos = clientes.filter(
            (cliente: any) => cliente.estado === true
          ).length;
          const inactivos = clientes.filter(
            (cliente: any) => cliente.estado === false
          ).length;

          setClientesActivos(activos);
          setClientesInactivos(inactivos);
        }
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getToken]);

  // Función para refrescar datos
  const refreshStats = async () => {
    try {
      const token = await getToken();

      // Refrescar datos del dashboard
      const dashboardRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/dashboard/summary`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json();
        setTotalClientes(dashboardData.totalClientes);
      }

      // Refrescar lista de clientes
      const clientesRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/clientes`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      if (clientesRes.ok) {
        const clientes = await clientesRes.json();
        const activos = clientes.filter(
          (cliente: any) => cliente.estado === true
        ).length;
        const inactivos = clientes.filter(
          (cliente: any) => cliente.estado === false
        ).length;

        setClientesActivos(activos);
        setClientesInactivos(inactivos);
      }
    } catch (error) {
      console.error("Error al actualizar datos:", error);
    }
  };

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
                CLIENTES
              </h1>
              <p className="text-sm text-muted-foreground">
                Gestiona tu base de clientes de forma profesional
              </p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center space-x-3">
            {/* <Button
              variant="outline"
              onClick={() => setOpenUpdateModal(true)}
              className="flex items-center space-x-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-800"
            >
              <Edit3 className="w-4 h-4" />
              <span>Actualizar Cliente</span>
            </Button> */}

            <Button
              onClick={() => setOpenCreateModal(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Cliente</span>
            </Button>
          </div>
        </div>

        {/* Stats rápidas - 3 tarjetas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tarjeta 1: Total Clientes (del dashboard) */}
          <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-blue-100 dark:border-blue-800 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Clientes
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {loading ? "..." : String(totalClientes)}
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
                  Clientes Activos
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {loading ? "..." : String(clientesActivos)}
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

          {/* Tarjeta 3: Clientes Inactivos */}
          <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-red-100 dark:border-red-800 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Clientes Inactivos
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {loading ? "..." : String(clientesInactivos)}
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

      {/* Modal para crear cliente */}
      <Dialog open={openCreateModal} onOpenChange={setOpenCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                <Plus className="w-3 h-3 text-white" />
              </div>
              <span>Crear Cliente</span>
            </DialogTitle>
            <DialogDescription>
              Registra un nuevo cliente en el sistema
            </DialogDescription>
          </DialogHeader>
          <FormCreateCliente
            setOpenModalCreate={setOpenCreateModal}
            onSuccess={refreshStats}
          />
        </DialogContent>
      </Dialog>

      {/* Modal para actualizar cliente */}
      <Dialog open={openUpdateModal} onOpenChange={setOpenUpdateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                <Edit3 className="w-3 h-3 text-white" />
              </div>
              <span>Actualizar Cliente</span>
            </DialogTitle>
            <DialogDescription>
              Busca y actualiza la información de un cliente existente
              <br />
              <span className="text-xs text-blue-600 mt-1 block">
                💡 Puedes probar buscando cualquier NIT para ver cómo funciona
                la búsqueda
              </span>
            </DialogDescription>
          </DialogHeader>
          <FormUpdateCliente
            setOpenModalUpdate={setOpenUpdateModal}
            onSuccess={refreshStats}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
