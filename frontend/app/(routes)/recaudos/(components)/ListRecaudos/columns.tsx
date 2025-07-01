"use client";

import { useState } from "react";
import { ColumnDef, type Column } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatValue } from "@/utils/FormartValue";
import { ReciboDetallesModal } from "../DetalleModalRecibo";
import { useToast } from "@/hooks/use-toast";

export type ReciboConRelaciones = {
  id: string;
  clienteId: string;
  usuarioId: string;
  tipo: string;
  concepto: string;
  Fechacrecion: string;
  empresaId: string;
  pdfUrl?: string;
  cliente: {
    nombre: string;
    apellidos: string;
    nit: string;
    email: string;
  };
  usuario: {
    nombre: string;
    rol: string;
  };
  detalleRecibo: {
    valorTotal: number;
    saldoPendiente: number;
    estado: string;
    idPedido: string;
    idRecibo: string;
  }[];
};

function ReciboDropdownActions({ recibo }: { recibo: ReciboConRelaciones }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(recibo.id);

    toast({
      title: `Número copiado: ${recibo.id}`,
      duration: 1000,
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menú</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpen(true)}>
            Ver detalles
          </DropdownMenuItem>
          {recibo.pdfUrl && (
            <DropdownMenuItem
              onClick={() => {
                const link = document.createElement("a");
                link.href = recibo.pdfUrl!;
                link.download = `recibo-${recibo.id}.pdf`;
                link.target = "_blank";
                link.click();
              }}
            >
              Descargar PDF
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleCopy}>
            Copiar Número
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ReciboDetallesModal
        open={open}
        onClose={() => setOpen(false)}
        recibo={recibo}
      />
    </>
  );
}

export const columns: ColumnDef<ReciboConRelaciones>[] = [
  {
    accessorKey: "id",
    header: "Número",
    cell: ({ row }) => (
      <div className="font-medium">#{row.original.id.slice(0, 4)}</div>
    ),
  },
  {
    accessorFn: (row) => row.cliente.nit,
    id: "nit",
    header: "NIT",
    cell: ({ row }) => row.original.cliente?.nit ?? "—",
  },
  {
    accessorFn: (row) => `${row.cliente.nombre} ${row.cliente.apellidos}`,
    id: "nombre",
    header: ({ column }: { column: Column<ReciboConRelaciones, unknown> }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Cliente
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const { nombre, apellidos } = row.original.cliente;
      return (
        <div className="font-medium">
          {`${nombre ?? ""} ${apellidos ?? ""}`.trim() || "—"}
        </div>
      );
    },
  },
  {
    id: "valorTotal",
    header: "Total Recibo",
    cell: ({ row }) => {
      const total = row.original.detalleRecibo.reduce(
        (sum, d) => sum + d.valorTotal,
        0
      );
      return <span className="font-medium">{formatValue(total)}</span>;
    },
  },
  {
    accessorKey: "tipo",
    header: "Tipo",
    cell: ({ row }) => row.original.tipo || "—",
  },
  {
    accessorKey: "concepto",
    header: "Concepto",
    cell: ({ row }) => row.original.concepto || "—",
  },
  {
    accessorKey: "Fechacrecion",
    header: ({ column }: { column: Column<ReciboConRelaciones, unknown> }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Fecha
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) =>
      new Date(row.original.Fechacrecion).toLocaleDateString("es-CO"),
  },
  {
    id: "vendedor",
    header: "Vendedor",
    cell: ({ row }) => row.original.usuario?.nombre ?? "—",
  },
  {
    id: "pedidosAfectados",
    header: "Pedidos Afectados",
    cell: ({ row }) => {
      const pedidos = row.original.detalleRecibo
        .map((detalle) => `#${detalle.idPedido.slice(0, 4)}`)
        .join(", ");
      return pedidos || "—";
    },
  },
  {
    id: "acciones",
    header: "Acciones",
    cell: ({ row }) => {
      const recibo = row.original;
      return <ReciboDropdownActions recibo={recibo} />;
    },
  },
];
