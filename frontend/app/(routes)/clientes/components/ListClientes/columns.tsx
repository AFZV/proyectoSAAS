"use client";

import { ArrowUpDown, Edit3, Eye, MoreHorizontal, Copy } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { FormUpdateCliente } from "../FormUpdateCliente/FormUpdateCliente";

// Tipo actualizado según tu backend
export type Cliente = {
  id: string; // ✅ necesario para PATCH
  nit: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  email?: string;
  direccion?: string; // ✅ nuevo
  ciudad: string;
  departamento?: string; // ✅ nuevo
  estado?: boolean;
  usuario: string; // nombre del vendedor
  vendedorId: string; // ✅ para el select en edición
};

// Componente para mostrar detalles del cliente
function ClienteDetalles({
  cliente,
  onClose,
}: {
  cliente: Cliente;
  onClose: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información Personal */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            Información Personal
          </h3>
          <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                NIT
              </label>
              <p className="font-mono text-lg">{cliente.nit}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Nombre Completo
              </label>
              <p className="text-lg">
                {cliente.nombre} {cliente.apellidos}
              </p>
            </div>
            {cliente.email && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Email
                </label>
                <p>{cliente.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Información de Contacto */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Información de Contacto</h3>
          <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Teléfono
              </label>
              <p className="font-mono">
                {cliente.telefono || "No especificado"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Ciudad
              </label>
              <p>{cliente.ciudad || "No especificada"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Estado
              </label>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  cliente.estado ?? true
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                }`}
              >
                {cliente.estado ?? true ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>
        </div>

        {/* Información del Vendedor */}
        <div className="space-y-4 md:col-span-2">
          <h3 className="font-semibold text-lg">Información del Vendedor</h3>
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {cliente.usuario
                    ? cliente.usuario.charAt(0).toUpperCase()
                    : "?"}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Vendedor Asignado
                </label>
                <p className="font-medium">
                  {cliente.usuario || "Sin asignar"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onClose}>Cerrar</Button>
      </div>
    </div>
  );
}

// Componente de acciones para cada fila
function ClienteActions({ cliente }: { cliente: Cliente }) {
  const { toast } = useToast();
  const [showDetalles, setShowDetalles] = useState(false);
  const [showEditar, setShowEditar] = useState(false);

  const handleView = () => {
    setShowDetalles(true);
  };

  const handleEdit = () => {
    setShowEditar(true);
  };

  const handleCopyNit = async () => {
    try {
      await navigator.clipboard.writeText(cliente.nit);
      toast({
        title: "NIT Copiado",
        description: `${cliente.nit} copiado al portapapeles`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar el NIT",
        variant: "destructive",
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
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleView}>
            <Eye className="mr-2 h-4 w-4" />
            Ver detalles
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEdit}>
            <Edit3 className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCopyNit}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar NIT
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal de Detalles */}
      <Dialog open={showDetalles} onOpenChange={setShowDetalles}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              Detalles del Cliente
            </DialogTitle>
            <DialogDescription>
              Información completa de {cliente.nombre} {cliente.apellidos}
            </DialogDescription>
          </DialogHeader>
          <ClienteDetalles
            cliente={cliente}
            onClose={() => setShowDetalles(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de Editar */}
      <Dialog open={showEditar} onOpenChange={setShowEditar}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit3 className="w-5 h-5 mr-2" />
              Editar Cliente
            </DialogTitle>
            <DialogDescription>
              Actualiza la información de {cliente.nombre} {cliente.apellidos}
            </DialogDescription>
          </DialogHeader>
          <FormUpdateCliente
            setOpenModalUpdate={setShowEditar}
            clienteInicial={cliente}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export const columns: ColumnDef<Cliente>[] = [
  {
    accessorKey: "nit",
    header: ({ column }: { column: Column<Cliente, unknown> }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          NIT
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const nit = row.getValue("nit") as string;
      return <div className="font-medium font-mono text-sm">{nit}</div>;
    },
  },
  {
    accessorKey: "nombre",
    header: ({ column }: { column: Column<Cliente, unknown> }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Nombre Completo
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const nombre = row.original.nombre;
      const apellidos = row.original.apellidos;
      const email = row.original.email;

      return (
        <div className="space-y-1">
          <div className="font-medium">
            {nombre} {apellidos}
          </div>
          {email && (
            <div className="text-sm text-muted-foreground">{email}</div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "telefono",
    header: "Teléfono",
    cell: ({ row }) => {
      const telefono = row.getValue("telefono") as string;
      return (
        <div className="font-mono text-sm">{telefono || "No especificado"}</div>
      );
    },
  },
  {
    accessorKey: "ciudad",
    header: ({ column }: { column: Column<Cliente, unknown> }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Ciudad
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const ciudad = row.getValue("ciudad") as string;
      return <div className="text-sm">{ciudad || "No especificada"}</div>;
    },
  },
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ row }) => {
      const estado = row.original.estado ?? true;
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            estado
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
          }`}
        >
          {estado ? "Activo" : "Inactivo"}
        </span>
      );
    },
  },
  {
    accessorKey: "usuario",
    header: "Vendedor",
    cell: ({ row }) => {
      const vendedor = row.original.usuario;
      const inicial = vendedor ? vendedor.charAt(0).toUpperCase() : "?";

      return (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-white">{inicial}</span>
          </div>
          <span className="font-medium text-sm">
            {vendedor || "Sin asignar"}
          </span>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Acciones</div>,
    cell: ({ row }) => {
      const cliente = row.original;
      return (
        <div className="text-right">
          <ClienteActions cliente={cliente} />
        </div>
      );
    },
  },
];
