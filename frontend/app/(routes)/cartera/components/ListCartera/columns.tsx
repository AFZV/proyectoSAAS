"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ClienteConBalance = {
  id: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  ciudad: string;
  email?: string;
  balance: number;
};

export function getColumns(
  onVerDetalle: (cliente: ClienteConBalance) => void,
  onAjusteManual: (cliente: ClienteConBalance) => void
): ColumnDef<ClienteConBalance>[] {
  return [
    {
      accessorKey: "nombre",
      header: "Nombre",
      cell: ({ row }) => {
        const { nombre, apellidos, email } = row.original;
        return (
          <div className="space-y-1">
            <div className="font-medium">
              {nombre} {apellidos}
            </div>
            {email && (
              <div className="text-xs text-muted-foreground">{email}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "telefono",
      header: "Teléfono",
      cell: ({ row }) => (
        <div className="font-mono text-sm">
          {row.original.telefono || "No especificado"}
        </div>
      ),
    },
    {
      accessorKey: "ciudad",
      header: "Ciudad",
    },
    {
      accessorKey: "balance",
      header: "Balance",
      cell: ({ row }) => {
        const balance = row.original.balance;
        const color =
          balance > 0
            ? "text-red-600"
            : balance < 0
            ? "text-green-600"
            : "text-gray-500";

        return (
          <div className={`font-semibold ${color}`}>
            {balance === 0 ? "$0" : `$${balance.toLocaleString("es-CO")}`}
          </div>
        );
      },
    },
    {
      id: "acciones",
      header: "Acciones",
      cell: ({ row }) => {
        const cliente = row.original;

        return (
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onVerDetalle(cliente)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Ver movimientos</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAjusteManual(cliente)}
                  >
                    <Pencil className="h-4 w-4 text-blue-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Registrar ajuste manual
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },
  ];
}
