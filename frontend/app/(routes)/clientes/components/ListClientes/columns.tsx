"use client";

import { ArrowUpDown, Edit3, Eye, MoreHorizontal } from "lucide-react";
import { ColumnDef, type Column } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Cliente = {
  nit: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  ciudad: string;
  estado: boolean;
  usuario: {
    nombre: string;
  };
};

// Componente de acciones para cada fila
function ClienteActions({ cliente }: { cliente: Cliente }) {
  const handleView = () => {
    // TODO: Implementar vista detallada del cliente
    console.log("Ver cliente:", cliente.nit);
  };

  const handleEdit = () => {
    // TODO: Implementar edición rápida del cliente
    console.log("Editar cliente:", cliente.nit);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Abrir menú</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        <DropdownMenuItem onClick={handleView}>
          <Eye className="mr-2 h-4 w-4" />
          Ver detalles
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEdit}>
          <Edit3 className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigator.clipboard.writeText(cliente.nit)}
        >
          Copiar NIT
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const columns: ColumnDef<Cliente>[] = [
  {
    accessorKey: "nit",
    header: ({ column }: { column: Column<Cliente, unknown> }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          NIT
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const nit = row.getValue("nit") as string;
      return <div className="font-medium">{nit}</div>;
    },
  },
  {
    accessorKey: "nombre",
    header: "Nombre Completo",
    cell: ({ row }) => {
      const nombre = row.original.nombre;
      const apellidos = row.original.apellidos;
      return (
        <div>
          <div className="font-medium">{nombre} {apellidos}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "telefono",
    header: "Teléfono",
    cell: ({ row }) => {
      const telefono = row.getValue("telefono") as string;
      return <div className="font-mono">{telefono}</div>;
    },
  },
  {
    accessorKey: "ciudad",
    header: ({ column }: { column: Column<Cliente, unknown> }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Ciudad
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ row }) => {
      const estado = row.getValue("estado") as boolean;
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            estado
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
          }`}
        >
          {estado ? "Activo" : "Inactivo"}
        </span>
      );
    },
  },
  {
    accessorKey: "usuario.nombre",
    header: "Vendedor",
    cell: ({ row }) => {
      const vendedor = row.original.usuario;
      return (
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
            <span className="text-xs font-medium text-blue-600">
              {vendedor.nombre.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="font-medium">{vendedor.nombre}</span>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => {
      const cliente = row.original;
      return <ClienteActions cliente={cliente} />;
    },
  },
];