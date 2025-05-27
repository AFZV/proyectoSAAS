"use client";

import { ColumnDef } from "@tanstack/react-table";
import { formatValue } from "@/utils/FormartValue";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { headers } from "next/headers";

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
  estado: string;
};

export const columns: ColumnDef<Pedido>[] = [
  {
    accessorKey: "id",
    header: "Id",
  },
  {
    accessorKey: "cliente.nit", // Accede a cliente.nombres
    header: "Nit",
    cell: ({ row }) => {
      const nit = row.original.cliente?.nit;
      return nit;
    },
  },
  {
    accessorKey: "cliente.nombres", // Accede a cliente.nombres
    header: "Cliente",
    cell: ({ row }) => {
      const cliente = row.original.cliente;
      return cliente
        ? `${cliente.nombres ?? ""} ${cliente.apellidos ?? ""}`.trim() || "—"
        : "—"; // Si no hay cliente, muestra "—"
    },
  },
  {
    accessorKey: "total.total",
    header: "Valor",
    cell: ({ row }) => {
      const total = row.original.total;
      return formatValue(total);
    },
  },
  {
    accessorKey: "vendedor.nombres",
    header: "Vendedor",
    cell: ({ row }) => row.original.vendedor?.nombres ?? "—", // Si no hay vendedor, muestra "—"
  },
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ row }) => row.original.estado,
  },
  ///seguir trabajando de qui hacia abajo
  {
    id: "CambiarEstado",
    header: () => <div>Cambiar estado</div>,
    cell: ({ row }) => {
      return <Button>accion</Button>;
    },
  },
  {
    id: "verPedido",
    header: () => <div>Ver Pedidoi</div>,
    cell: ({ row }) => {
      return <Button className="bg-sky-700">Ver pedido</Button>;
    },
  },
];
