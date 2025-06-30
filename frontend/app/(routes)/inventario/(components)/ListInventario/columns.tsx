// components/Inventario/ListInventario/columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Eye, Edit3, Copy } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

// Tipo según tu API
export type ProductoInventario = {
  id: string;
  nombre: string;
  precioCompra: number;
  fechaCreado: string;
  inventario: { stockReferenciaOinicial: number }[];
};

// Modal client-only
const InventarioDetalleModal = dynamic(
  () => import("./InventarioDetalleModal").then((mod) => mod.InventarioDetalleModal),
  { ssr: false }
);

function InventarioActions({ producto }: { producto: ProductoInventario }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [detalle, setDetalle] = useState<ProductoInventario | null>(null);
  const [loading, setLoading] = useState(false);
  const { getToken } = useAuth();

  const handleView = async () => {
    // 1) cerramos el menu
    setMenuOpen(false);
    // 2) abrimos el modal ya
    setOpen(true);
    setLoading(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("No auth token");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/inventario/productosall/${producto.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        console.error("❌ Error detalle:", res.status);
        return;
      }

      const { producto: prod } = await res.json();
      setDetalle(prod);
    } catch (err) {
      console.error("❌ Error en handleView:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    console.log("✏️ Editar producto:", producto.id);
  };
  const handleCopyId = () => {
    navigator.clipboard.writeText(producto.id);
  };

  return (
    <>
      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenu.Trigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" disabled={loading}>
            <span className="sr-only">Abrir menú</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={5}
            className="z-50 min-w-[8rem] rounded-md border bg-white p-1 shadow-md"
          >
            <DropdownMenu.Label className="px-2 py-1.5 text-sm font-semibold">
              Acciones
            </DropdownMenu.Label>
            <DropdownMenu.Item
              onClick={handleView}
              disabled={loading}
              className="flex items-center px-2 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-50"
            >
              <Eye className="mr-2 h-4 w-4" />
              {loading ? "Cargando..." : "Ver Cardex"}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={handleEdit}
              className="flex items-center px-2 py-1.5 text-sm hover:bg-gray-100"
            >
              <Edit3 className="mr-2 h-4 w-4" />
              Editar producto
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-gray-200" />
            <DropdownMenu.Item
              onClick={handleCopyId}
              className="flex items-center px-2 py-1.5 text-sm hover:bg-gray-100"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar ID
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      { /* Montamos siempre el modal (aunque todavía no tengamos datos de detalle) */ }
      <InventarioDetalleModal
        open={open}
        onClose={() => {
          setOpen(false);
          setDetalle(null);
        }}
        producto={detalle ?? producto}
      />
    </>
  );
}

export const columns: ColumnDef<ProductoInventario>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
  },
  {
    accessorKey: "precioCompra",
    header: "Precio Compra",
    cell: ({ row }) => {
      const v = row.getValue("precioCompra") as number;
      return `$ ${v.toLocaleString("es-CO")}`;
    },
  },
  {
    accessorKey: "fechaCreado",
    header: "Fecha",
    cell: ({ row }) => {
      const d = new Date(row.getValue("fechaCreado") as string);
      return (
        <>
          <div>
            {d.toLocaleDateString("es-CO", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </div>
          <div className="text-xs text-muted-foreground">
            {d.toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </>
      );
    },
  },
  {
    id: "stockReferenciaOinicial",
    header: "Stock Inicial",
    cell: ({ row }) => {
      const inv = row.original.inventario;
      return (
        inv?.[0]?.stockReferenciaOinicial
          .toLocaleString("es-CO") || "0"
      );
    },
  },
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => <InventarioActions producto={row.original} />,
  },
];
