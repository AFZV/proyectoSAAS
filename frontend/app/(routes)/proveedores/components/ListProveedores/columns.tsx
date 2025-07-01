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
import { useToast } from "@/hooks/use-toast";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

export type Proveedor = {
  id: string;
  identificacion: string;
  razonsocial: string;
  telefono: string;
  direccion: string;
};

// Componente de acciones para cada fila
function UsuarioActions({ proveedor }: { proveedor: Proveedor }) {
  const { toast } = useToast();
  const [openModal, setOpenModal] = useState(false);
  const router = useRouter();

  const handleCopy = () => {
    navigator.clipboard.writeText(proveedor.identificacion);
    toast({
      title: `Correo copiado: ${proveedor.identificacion}✅`,
      variant: "default",
      duration: 2000,
    });
  };

  // const { getToken } = useAuth();

  //   const handleChangeEstado = async () => {
  //     console.log("🟢 Entrando a cambiar estado");

  //     try {
  //       const token = await getToken();
  //       console.log("✅ Token obtenido:", token);

  //       const res = await fetch(
  //         `${process.env.NEXT_PUBLIC_API_URL}/usuario/estado/${usuario.id}`,
  //         {
  //           method: "PATCH",
  //           headers: {
  //             Authorization: `Bearer ${token}`,
  //           },
  //         }
  //       );

  //       if (!res.ok) throw new Error("Error al cambiar estado");
  //       console.log("📦 Response recibido:", res);

  //       toast({ title: "Estado actualizado ✅" });
  //       router.refresh();
  //     } catch (error) {
  //       console.error("❌ Error en cambio de estado:", error);
  //       toast({
  //         title: "Error al cambiar estado",
  //         variant: "destructive",
  //         duration: 1500,
  //       });
  //     }
  //   };

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
          {/* <DropdownMenuItem onClick={() => setOpenModal(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Ver detalles
          </DropdownMenuItem> */}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCopy}>
            Copiar Identificacion
          </DropdownMenuItem>
          {/* <DropdownMenuItem onClick={handleChangeEstado}>
            Cambiar Estado
          </DropdownMenuItem> */}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* MODAL: Detalles de la empresa */}
      {/* <UsuarioDetalleModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        usuario={usuario}
      /> */}
    </>
  );
}
export const columns: ColumnDef<Proveedor>[] = [
  {
    accessorKey: "identificacion",
    header: "Identificación",
    cell: ({ row }) => {
      const identificacion = row.original.identificacion;
      return (
        <div>
          <div className="font-medium">{identificacion}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "razonsocial",
    header: ({ column }: { column: Column<Proveedor, unknown> }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Razon Social
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const razonsocial = row.getValue("razonsocial") as string;
      return <div className="font-medium">{razonsocial}</div>;
    },
  },
  {
    accessorKey: "telefono",
    header: "Telefono",
    cell: ({ row }) => {
      const telefono = row.original.telefono;
      return (
        <div className="flex items-center">
          <span className="font-medium">{telefono}</span>
        </div>
      );
    },
  },

  {
    accessorKey: "direccion",
    header: "Dirección",
    cell: ({ row }) => {
      const direccion = row.original.direccion;
      return (
        <div className="flex items-center">
          <span className="font-medium">{direccion}</span>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => {
      const proveedor = row.original;
      return <UsuarioActions proveedor={proveedor} />;
    },
  },
];
