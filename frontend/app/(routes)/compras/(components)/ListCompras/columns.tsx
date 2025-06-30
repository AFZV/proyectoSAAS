"use client";
import dynamic from "next/dynamic";
import { ArrowUpDown, Edit3, Eye, Package, Calendar } from "lucide-react";
import { ColumnDef, type Column } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Import dinámico, SSR desactivado:
const CompraDetalleModal = dynamic(
  () => import("./ComprasDetalleModal").then((mod) => mod.CompraDetalleModal),
  { ssr: false }
);

// Tipo actualizado basado en los datos reales que recibes de tu API
export type Compra = {
  idCompra: string;
  FechaCompra: string;
  proveedor: string;  // Agregué este campo
  totalCompra: number; // Agregué este campo
  productos: {
    nombre: string;
    cantidad: number;
    cantidadMovimiento: number;
  }[];
};

// Componente de acciones para cada fila - SOLO BOTONES
function CompraActions({ compra }: { compra: Compra }) {
  const [openModal, setOpenModal] = useState(false);
  const router = useRouter();
  
  const handleView = () => {
    console.log("Abriendo modal para compra:", compra.idCompra);
    setOpenModal(true);
  };

  const handleEdit = () => {
    console.log("Editar compra:", compra.idCompra);
    // Aquí puedes redirigir a una página de edición o abrir un modal de edición
    // router.push(`/compras/edit/${compra.idCompra}`);
  };

  const handleCloseModal = () => {
    console.log("Cerrando modal");
    setOpenModal(false);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleView}
          className="h-8"
        >
          <Eye className="h-4 w-4 mr-1" />
          Ver
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleEdit}
          className="h-8"
        >
          <Edit3 className="h-4 w-4 mr-1" />
          Editar
        </Button>
      </div>
      
      {/* Modal fuera de los botones */}
      <CompraDetalleModal 
        open={openModal} 
        onClose={handleCloseModal} 
        idCompra={compra.idCompra} 
      />
    </>
  );
}

// Columnas de la tabla
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
    accessorKey: "proveedor",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Proveedor
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const prov = row.getValue("proveedor") as string;
      return <div className="font-medium">{prov}</div>;
    },
  },
  {
    accessorKey: "FechaCompra",
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
      const fecha = row.getValue("FechaCompra") as string;
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
      
      const primerProducto = productos[0];
      const productosRestantes = productos.length - 1;
      
      return (
        <div className="flex flex-col">
          <span className="font-medium">{primerProducto.nombre}</span>
          {productosRestantes > 0 && (
            <span className="text-xs text-muted-foreground">
              +{productosRestantes} producto{productosRestantes > 1 ? 's' : ''} más
            </span>
          )}
        </div>
      );
    },
  },
  {
    id: "totalCompra",
    header: "Valor Total",
    accessorFn: (row: Compra) => row.totalCompra,
    cell: ({ getValue }) => {
      const total = getValue() as number;
      return (
        <div className="text-left font-mono">
          {total.toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0,
          })}
        </div>
      );
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