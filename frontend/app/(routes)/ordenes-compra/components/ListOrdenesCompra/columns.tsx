"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Download, Trash2, Send, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  eliminarOrdenCompra,
  actualizarEstadoOC,
  descargarExcelOC,
} from "../../services/ordenes-compra.service";
import type { OrdenCompraResumen, EstadoOC } from "../../types/ordenes-compra.types";

const ESTADO_BADGE: Record<EstadoOC, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  BORRADOR: { label: "Borrador", variant: "secondary" },
  ENVIADA: { label: "Enviada", variant: "default" },
  CONFIRMADA: { label: "Confirmada", variant: "outline" },
  CANCELADA: { label: "Cancelada", variant: "destructive" },
};

function OcActions({ oc }: { oc: OrdenCompraResumen }) {
  const { getToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      await descargarExcelOC(token, oc.id);
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    }
  };

  const handleEstado = async (estado: EstadoOC) => {
    try {
      const token = await getToken();
      if (!token) return;
      await actualizarEstadoOC(token, oc.id, estado);
      toast({ title: `Estado actualizado a ${estado}` });
      router.refresh();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    }
  };

  const handleEliminar = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      await eliminarOrdenCompra(token, oc.id);
      toast({ title: "Orden eliminada" });
      router.refresh();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    }
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
        <DropdownMenuItem onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Descargar Excel
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {oc.estado === "BORRADOR" && (
          <DropdownMenuItem onClick={() => handleEstado("ENVIADA")}>
            <Send className="mr-2 h-4 w-4" />
            Marcar como Enviada
          </DropdownMenuItem>
        )}
        {oc.estado === "ENVIADA" && (
          <DropdownMenuItem onClick={() => handleEstado("CONFIRMADA")}>
            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
            Confirmar OC
          </DropdownMenuItem>
        )}
        {(oc.estado === "BORRADOR" || oc.estado === "ENVIADA") && (
          <DropdownMenuItem onClick={() => handleEstado("CANCELADA")}>
            <XCircle className="mr-2 h-4 w-4 text-orange-600" />
            Cancelar OC
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {oc.estado === "BORRADOR" && (
          <DropdownMenuItem
            onClick={handleEliminar}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const columns: ColumnDef<OrdenCompraResumen>[] = [
  {
    accessorKey: "id",
    header: "OC Ref.",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium">
        {row.original.id.slice(0, 8).toUpperCase()}
      </span>
    ),
  },
  {
    id: "proveedor",
    header: "Proveedor",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.proveedor.razonsocial}</div>
        <div className="text-xs text-muted-foreground">
          {row.original.proveedor.identificacion}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "fechaCreacion",
    header: "Fecha",
    cell: ({ row }) =>
      new Date(row.original.fechaCreacion).toLocaleDateString("es-CO"),
  },
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ row }) => {
      const { label, variant } = ESTADO_BADGE[row.original.estado] ?? {
        label: row.original.estado,
        variant: "secondary" as const,
      };
      return <Badge variant={variant}>{label}</Badge>;
    },
  },
  {
    accessorKey: "totalProductos",
    header: "Productos",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.totalProductos}</span>
    ),
  },
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => <OcActions oc={row.original} />,
  },
];
