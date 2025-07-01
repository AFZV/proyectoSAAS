// app/(routes)/inventario/(components)/ListInventario/columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Eye, Edit, ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export type ProductoInventario = {
  id: string;
  nombre: string;
  precioCompra: number;
  fechaCreado: string;
  inventario: { stockReferenciaOinicial: number; stockActual?: number }[];
};

// Importaciones dinámicas
import dynamic from "next/dynamic";

const InventarioDetalleModal = dynamic(
  () => import("./InventarioDetalleModal").then((mod) => ({ default: mod.InventarioDetalleModal })),
  { ssr: false }
);

const AjusteManualModal = dynamic(
  () => import("./AjusteManualModal").then((mod) => ({ default: mod.AjusteManualModal })),
  { ssr: false }
);

function InventarioActions({ producto }: { producto: ProductoInventario }) {
  const [showCardex, setShowCardex] = useState(false);
  const [showAjuste, setShowAjuste] = useState(false);
  const router = useRouter();

  const handleCardex = () => {
    setShowCardex(true);
  };

  const handleAjuste = () => {
    setShowAjuste(true);
  };

  const handleCloseCardex = () => {
    setShowCardex(false);
  };

  const handleCloseAjuste = () => {
    setShowAjuste(false);
    // Refresh después de ajuste
    setTimeout(() => {
      router.refresh();
    }, 300);
  };

  return (
    <div className="flex items-center gap-1">
      {/* Botón Ver Cardex */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCardex}
        className="h-8 w-8 p-0 hover:bg-gray-100"
        disabled={showCardex || showAjuste}
        title="Ver Cardex"
      >
        <Eye className="h-4 w-4" />
      </Button>

      {/* Botón Ajuste */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleAjuste}
        className="h-8 w-8 p-0 hover:bg-gray-100"
        disabled={showCardex || showAjuste}
        title="Ajuste Manual"
      >
        <Edit className="h-4 w-4" />
      </Button>

      {/* Modales */}
      {showCardex && (
        <InventarioDetalleModal
          open={showCardex}
          onClose={handleCloseCardex}
          producto={producto}
        />
      )}

      {showAjuste && (
        <AjusteManualModal
          open={showAjuste}
          onClose={handleCloseAjuste}
          producto={producto}
        />
      )}
    </div>
  );
}

export const columns: ColumnDef<ProductoInventario>[] = [
  { 
    accessorKey: "nombre", 
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 hover:bg-transparent"
        >
          Nombre
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: "precioCompra",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 hover:bg-transparent"
        >
          Precio Compra
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => `$ ${(row.getValue("precioCompra") as number).toLocaleString()}`,
    enableSorting: true,
  },
  {
    accessorKey: "fechaCreado",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 hover:bg-transparent"
        >
          Fecha
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const d = new Date(row.getValue("fechaCreado") as string);
      return (
        <>
          <div>{d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}</div>
          <div className="text-xs text-muted-foreground">
            {d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </>
      );
    },
    enableSorting: true,
  },
  {
    id: "stockReferenciaOinicial",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 hover:bg-transparent"
        >
          Stock Inicial
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    accessorFn: (row) => row.inventario?.[0]?.stockReferenciaOinicial ?? 0,
    cell: ({ row }) =>
      (row.original.inventario?.[0]?.stockReferenciaOinicial ?? 0).toLocaleString(),
    enableSorting: true,
  },
  {
    id: "stockActual",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 hover:bg-transparent"
        >
          Stock Actual
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    accessorFn: (row) => row.inventario?.[0]?.stockActual ?? 0,
    cell: ({ row }) =>
      (row.original.inventario?.[0]?.stockActual ?? 0).toLocaleString(),
    enableSorting: true,
  },
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => <InventarioActions producto={row.original} />,
    enableSorting: false,
  },
];