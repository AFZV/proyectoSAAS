"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BadgeDollarSign, FileSearch } from "lucide-react";
import { ClienteCartera } from "../ListCartera/ListCartera.types";
import { BuscarClienteCartera } from "../BuscarClienteCartera";

export type CarteraStats = {
  totalSaldo: number;
  totalPositivos: number;
  totalNegativos: number;
};

export function HeaderCartera({
  onClienteSeleccionado,
  stats,
}: {
  onClienteSeleccionado: (cliente: ClienteCartera) => void;
  stats: CarteraStats;
}) {
  const [openBuscarModal, setOpenBuscarModal] = useState<boolean>(false);

  return (
    <div className="border-b bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/20">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center shadow-md">
              <BadgeDollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-700 bg-clip-text text-transparent">
                CARTERA
              </h1>
              <p className="text-sm text-muted-foreground">
                Gestión de saldos y ajustes manuales
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setOpenBuscarModal(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white shadow-md"
            >
              <FileSearch className="w-4 h-4" />
              <span>Buscar Cliente</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Saldo Total"
            value={stats.totalSaldo.toLocaleString("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 0,
            })}
            color="yellow"
            description="Saldo acumulado de clientes"
          />
          <StatCard
            title="Entradas (+)"
            value={stats.totalPositivos.toLocaleString("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 0,
            })}
            color="green"
            description="Movimientos que aumentan el saldo"
          />
          <StatCard
            title="Salidas (−)"
            value={stats.totalNegativos.toLocaleString("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 0,
            })}
            color="red"
            description="Movimientos que reducen el saldo"
          />
        </div>
      </div>

      {/* Modales futuros */}
      <Dialog open={openBuscarModal} onOpenChange={setOpenBuscarModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center">
                <FileSearch className="w-3 h-3 text-white" />
              </div>
              <span>Buscar Cliente</span>
            </DialogTitle>
            <DialogDescription>
              Busca un cliente por NIT para ver sus movimientos
            </DialogDescription>
          </DialogHeader>
          <BuscarClienteCartera
            onClienteSeleccionado={(cliente) => {
              onClienteSeleccionado(cliente); // Pasa el cliente hacia arriba
              setOpenBuscarModal(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  color,
}: {
  title: string;
  value: number | string;
  description: string;
  color: "yellow" | "green" | "red";
}) {
  const colorMap = {
    yellow: {
      border: "border-yellow-100 dark:border-yellow-800",
      text: "text-yellow-600",
      bg: "from-yellow-500 to-yellow-600",
    },
    green: {
      border: "border-green-100 dark:border-green-800",
      text: "text-green-600",
      bg: "from-green-500 to-green-600",
    },
    red: {
      border: "border-red-100 dark:border-red-800",
      text: "text-red-600",
      bg: "from-red-500 to-red-600",
    },
  }[color];

  return (
    <div
      className={`bg-white dark:bg-gray-800/50 rounded-lg p-4 border ${colorMap.border} shadow-sm hover:shadow-md transition-all duration-200`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold ${colorMap.text}`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <div
          className={`w-8 h-8 bg-gradient-to-r ${colorMap.bg} rounded-full flex items-center justify-center`}
        >
          <BadgeDollarSign className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  );
}
