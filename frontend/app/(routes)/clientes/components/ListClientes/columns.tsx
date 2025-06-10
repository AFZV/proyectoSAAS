"use client";

import { ArrowUpDown } from "lucide-react";
import { ColumnDef, type Column } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";

export type Cliente = {
  nit: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  codigoCiud: string;
  email: string;
  vendedor: {
    nombre: string;
  };
};

export const columns: ColumnDef<Cliente>[] = [
  {
    accessorKey: "nit",
    header: "Nit",
  },
  {
    accessorKey: "nombres",
    header: "Nombre",
  },
  {
    accessorKey: "apellidos",
    header: "Apellido",
  },
  {
    accessorKey: "telefono",
    header: "Telefono",
  },
  {
    accessorKey: "codigoCiud",
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
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "vendedor.nombre",
    header: "Vendedor",
    cell: ({ row }) => {
      const vendedor = row.original.vendedor;
      return vendedor.nombre;
    },
  },
];
