"use client";

import { ColumnDef } from "@tanstack/react-table";
export type Pedido = {
  id: string;
  clienteId: string;
  vendedorId: string;
  total: number;
  vendedor: {
    nombres: string;
  };
  cliente?: {
    nit: string;
    nombres: string;
    apellidos: string;
  } | null;
};

export const columns: ColumnDef<Pedido>[] = [
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "amount",
    header: "Amount",
  },
];
