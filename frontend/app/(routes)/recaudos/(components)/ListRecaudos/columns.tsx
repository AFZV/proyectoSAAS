"use client";

import { ColumnDef } from "@tanstack/react-table";
import { formatValue } from "@/utils/FormartValue";
import { ReciboActions } from "../ReciboActions";
export type ReciboConRelaciones = {
  id: string;
  clienteId: string;
  usuarioId: string;
  valor: number;
  tipo: string;
  concepto: string;
  cliente: {
    nit: string;
    nombres: string;
    apellidos: string;
  };
  vendedor: {
    id: string;
    nombres: string;
  };
};
export const columns: ColumnDef<ReciboConRelaciones>[] = [
  {
    accessorKey: "id",
    header: "Id",
  },
  {
    accessorKey: "clienteId",
    header: "Nit",
    cell: ({ row }) => {
      const nit = row.original.cliente.nit;
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
    accessorKey: "valor.valor",
    header: "Valor",
    cell: ({ row }) => {
      const valor = row.original.valor;
      return formatValue(valor);
    },
  },
  {
    accessorKey: "tipo",
    header: "Tipo",
    cell: ({ row }) => {
      const tipo = row.original?.tipo;
      return tipo || "—";
    },
  },
  {
    accessorKey: "concepto",
    header: "Concepto",
    cell: ({ row }) => {
      const concepto = row.original?.concepto;
      return concepto || "—";
    },
  },
  {
    accessorKey: "vendedor.nombres",
    header: "Vendedor",
    cell: ({ row }) => row.original.vendedor?.nombres ?? "—", // Si no hay vendedor, muestra "—"
  },
  {
    id: "actions",
    header: () => <div className="text-center">Editar/Eliminar</div>,
    cell: ({ row }) => {
      const id = row.getValue("id") as string;
      return <ReciboActions id={id} />;
    },
  },
];
