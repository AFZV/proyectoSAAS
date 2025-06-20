"use client";

import { ArrowUpDown, Edit3, Eye, MoreHorizontal, Package, Calendar } from "lucide-react";
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

// Tipo basado en lo que devuelve tu API de compras
export type Compra = {
  idCompra: string;
  fechaCompra: string;
  productos: {
    nombre: string;
    cantidad: number;
    cantidadMovimiento: number;
  }[];
};

// Componente de acciones para cada fila (igual que ClienteActions)
function CompraActions({ compra }: { compra: Compra }) {
  const handleView = () => {
    console.log("Ver compra:", compra.idCompra);
  };

  const handleEdit = () => {
    console.log("Editar compra:", compra.idCompra);
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
        <DropdownMenuItem onClick={handleView}>
          <Eye className="mr-2 h-4 w-4" />
          Ver detalles
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEdit}>
          <Edit3 className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigator.clipboard.writeText(compra.idCompra)}
        >
          Copiar ID
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Columnas de la tabla (similar a las de clientes)
export const columns: ColumnDef<Compra>[] = [
  {
    accessorKey: "idCompra",
    header: ({ column }: { column: Column<Compra, unknown> }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          ID Compra
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const id = row.getValue("idCompra") as string;
      return <div className="font-medium font-mono">{id ? `...${id.slice(-8)}` : 'N/A'}</div>;
    },
  },
  {
    accessorKey: "fechaCompra",
    header: ({ column }: { column: Column<Compra, unknown> }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <Calendar className="mr-2 h-4 w-4" />
          Fecha
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const fecha = row.getValue("fechaCompra") as string;
      if (!fecha) return <div className="text-muted-foreground">Sin fecha</div>;
      
      const fechaObj = new Date(fecha);
      const fechaFormateada = fechaObj.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      });
      
      return (
        <div>
          <div className="font-medium">{fechaFormateada}</div>
          <div className="text-xs text-muted-foreground">
            {fechaObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "productos",
    header: "Productos",
    cell: ({ row }) => {
      const productos = row.getValue("productos") as Compra['productos'];
      
      if (!productos || productos.length === 0) {
        return (
          <div className="flex items-center text-muted-foreground">
            <Package className="w-4 h-4 mr-2" />
            <span className="text-sm">Sin productos</span>
          </div>
        );
      }
      
      const totalProductos = productos.length;
      const primerProducto = productos[0]?.nombre || 'Producto sin nombre';
      
      return (
        <div>
          <div className="font-medium">{primerProducto}</div>
          {totalProductos > 1 && (
            <div className="text-xs text-muted-foreground">
              +{totalProductos - 1} producto{totalProductos > 2 ? 's' : ''} más
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: "cantidadTotal",
    header: ({ column }: { column: Column<Compra, unknown> }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Cantidad
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const productos = row.original.productos;
      if (!productos || productos.length === 0) {
        return <div className="text-right font-mono text-muted-foreground">0</div>;
      }
      
      const cantidadTotal = productos.reduce((sum, producto) => sum + (producto.cantidad || 0), 0);
      return <div className="text-right font-mono">{cantidadTotal.toLocaleString()}</div>;
    },
  },
  {
    id: "movimientoTotal",
    header: "Movimiento",
    cell: ({ row }) => {
      const productos = row.original.productos;
      if (!productos || productos.length === 0) {
        return <div className="text-right font-mono text-muted-foreground">0</div>;
      }
      
      const totalMovimiento = productos.reduce((sum, producto) => sum + (producto.cantidadMovimiento || 0), 0);
      return <div className="text-right font-mono">{totalMovimiento.toLocaleString()}</div>;
    },
  },
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => {
      const compra = row.original;
      return <CompraActions compra={compra} />;
    },
  },
];