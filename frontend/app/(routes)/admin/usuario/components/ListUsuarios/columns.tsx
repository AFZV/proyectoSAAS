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
import { UsuarioDetalleModal } from "../UsuarioDetalleModal";

export type Usuario = {
  id: string;
  codigo: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  correo: string;
  rol: string;
  estado: string;
  empresa: { nombreComercial: string };
};

// Componente de acciones para cada fila
function UsuarioActions({ usuario }: { usuario: Usuario }) {
  const { toast } = useToast();
  const [openModal, setOpenModal] = useState(false);
  const router = useRouter();

  const handleCopy = () => {
    navigator.clipboard.writeText(usuario.correo);
    toast({
      title: `Correo copiado: ${usuario.correo}✅`,
      variant: "default",
      duration: 2000,
    });
  };

  const { getToken } = useAuth();

  const handleChangeEstado = async () => {
    console.log("🟢 Entrando a cambiar estado");

    try {
      const token = await getToken();
      console.log("✅ Token obtenido:", token);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuario/estado/${usuario.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Error al cambiar estado");
      console.log("📦 Response recibido:", res);

      toast({ title: "Estado actualizado ✅" });
      router.refresh();
    } catch (error) {
      console.error("❌ Error en cambio de estado:", error);
      toast({
        title: "Error al cambiar estado",
        variant: "destructive",
        duration: 1500,
      });
    }
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
          <DropdownMenuItem onClick={() => setOpenModal(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Ver detalles
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCopy}>
            Copiar Correo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleChangeEstado}>
            Cambiar Estado
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* MODAL: Detalles de la empresa */}
      <UsuarioDetalleModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        usuario={usuario}
      />
    </>
  );
}
export const columns: ColumnDef<Usuario>[] = [
  {
    accessorKey: "codigo",
    header: "codigo",
    cell: ({ row }) => {
      const codigo = row.original.codigo;
      return (
        <div>
          <div className="font-medium">{codigo}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "nombre",
    header: ({ column }: { column: Column<Usuario, unknown> }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Nombre
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const nombre = row.getValue("nombre") as string;
      return <div className="font-medium">{nombre}</div>;
    },
  },
  {
    accessorKey: "apellidos",
    header: "Apellidos",
    cell: ({ row }) => {
      const apellidos = row.original.apellidos;
      return (
        <div className="flex items-center">
          <span className="font-medium">{apellidos}</span>
        </div>
      );
    },
  },
  {
    id: "empresa", // ← identificador para filtros
    accessorFn: (row) => row.empresa.nombreComercial,
    header: "Empresa",
    cell: ({ row }) => {
      const empresa = row.original.empresa.nombreComercial;
      return <div className="font-mono">{empresa}</div>;
    },
    filterFn: "includesString",
  },

  {
    accessorKey: "correo",
    header: "Correo",
    cell: ({ row }) => {
      const correo = row.original.correo;
      return (
        <div className="flex items-center">
          <span className="font-medium">{correo}</span>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => {
      const usuario = row.original;
      return <UsuarioActions usuario={usuario} />;
    },
  },
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ row }) => {
      const estado = row.original.estado;
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            estado === "activo"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
          }`}
        >
          {estado === "activo" ? "Activo" : "Inactivo"}
        </span>
      );
    },
  },
];
