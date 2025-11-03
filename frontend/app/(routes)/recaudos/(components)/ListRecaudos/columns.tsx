"use client";

import React, { useState } from "react";
import { ColumnDef, type Column } from "@tanstack/react-table";
import {
  ArrowUpDown,
  MoreHorizontal,
  CheckCircle,
  Loader2,
} from "lucide-react";
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
import { useAuth } from "@clerk/nextjs";

export type ReciboConRelaciones = {
  id: string;
  clienteId: string;
  usuarioId: string;
  tipo: string;
  concepto: string;
  Fechacrecion: string;
  empresaId: string;
  revisado?: boolean; // 👈 nuevo
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

function toBool(v: unknown) {
  return typeof v === "string" ? v === "true" : !!v;
}

/** Toggle de "revisado" con chulo verde */
function RevisadoToggle({ recibo }: { recibo: ReciboConRelaciones }) {
  const [revisado, setRevisado] = useState(!!recibo.revisado);
  const [loading, setLoading] = useState(false);
  const { getToken } = useAuth();
  const { toast } = useToast();
  React.useEffect(() => {
    setRevisado(!!recibo.revisado); // 👈 resync al cambiar props
  }, [recibo.id, recibo.revisado]);

  const toggle = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const BACKEND_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

      const resp = await fetch(`${BACKEND_URL}/recibos/${recibo.id}/revisado`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        // sin body: el backend hace toggle
      });

      // intenta leer JSON solo una vez
      let payload: any = null;
      const ct = resp.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        try {
          payload = await resp.json();
        } catch {
          payload = null;
        }
      }

      if (!resp.ok) {
        const msg =
          (payload && (payload.message || payload.error)) ||
          resp.statusText ||
          "Error al actualizar";
        throw new Error(msg);
      }

      // backend devuelve { revisado: boolean } o boolean
      const next =
        typeof payload === "boolean"
          ? payload
          : !!(payload && payload.revisado);

      setRevisado(next);
      // asegura consistencia con la tabla al paginar
      (recibo as any).revisado = next;

      toast({
        title: next
          ? "Recibo marcado como revisado"
          : "Marca de revisión quitada",
        duration: 900,
      });
    } catch (e: any) {
      toast({
        title: "No se pudo actualizar",
        description: e?.message || "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium
        ${
          revisado
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-muted border-muted-foreground/20 text-muted-foreground"
        }`}
      title={revisado ? "Revisado" : "Marcar como revisado"}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <CheckCircle
          className={`w-4 h-4 ${
            revisado ? "text-emerald-600" : "text-muted-foreground"
          }`}
        />
      )}
      {revisado ? "Revisado" : "Pendiente"}
    </button>
  );
}

/** Acciones desplegable (opcionalmente podrías agregar aquí también el toggle) */
function ReciboDropdownActions({ recibo }: { recibo: ReciboConRelaciones }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const pdfUrl = `https://files.bgacloudsaas.com/empresas/${recibo.empresaId}/recibos/recibo_${recibo.id}.pdf`;

  const openDetallesSafely = () => {
    // si hay algo más que cerrar, hazlo aquí antes
    setTimeout(() => setOpen(true), 0); // o requestAnimationFrame(() => setOpen(true))
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recibo.id);
      toast({ title: `Número copiado: ${recibo.id}`, duration: 1000 });
    } catch {
      toast({
        title: "No se pudo copiar",
        variant: "destructive",
        duration: 1200,
      });
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = `${pdfUrl}?v=${Date.now()}`;
    link.download = `recibo-${recibo.id}.pdf`;
    link.target = "_blank";
    link.rel = "noopener";
    link.click();
  };

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menú</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="w-44"
        >
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setMenuOpen(false);
              openDetallesSafely();
            }}
          >
            Ver detalles
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setMenuOpen(false);
              handleDownload();
            }}
          >
            Descargar PDF
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={async (e) => {
              e.preventDefault();
              setMenuOpen(false);
              await handleCopy();
            }}
          >
            Copiar número
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Si ReciboDetallesModal es Radix Dialog, esto ya evita la “pegada” */}
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
      <div className="font-medium">
        #{row.original.id.slice(0, 5).toUpperCase()}
      </div>
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
        Cliente <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const { nombre, apellidos } = row.original.cliente;
      return (
        <div className="font-medium">
          {`${nombre ?? ""} ${apellidos ?? ""}`.trim().toUpperCase() || "—"}
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
    cell: ({ row }) => row.original.tipo.toUpperCase() || "—",
  },
  {
    accessorKey: "concepto",
    header: "Concepto",
    cell: ({ row }) => row.original.concepto.toUpperCase() || "—",
  },
  {
    accessorKey: "Fechacrecion",
    header: ({ column }: { column: Column<ReciboConRelaciones, unknown> }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Fecha <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) =>
      new Date(row.original.Fechacrecion).toLocaleDateString("es-CO"),
  },
  {
    id: "vendedor",
    header: "Vendedor",
    cell: ({ row }) => row.original.usuario?.nombre.toUpperCase() ?? "—",
  },
  {
    id: "pedidosAfectados",
    header: "Pedidos Afectados",
    cell: ({ row }) => {
      const pedidos = row.original.detalleRecibo
        .map((d) => `#${d.idPedido.slice(0, 5).toUpperCase()}`)
        .join(", ");
      return pedidos || "—";
    },
  },

  // 👇 NUEVA COLUMNA
  {
    id: "revisado",
    header: ({ column }: { column: Column<ReciboConRelaciones, unknown> }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Estado <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    // Valor usado para ordenar (0 = Pendiente, 1 = Revisado)
    accessorFn: (row) => (row.revisado ? 1 : 0),
    // Asegura ordenación básica por el número anterior
    sortingFn: (rowA, rowB, columnId) => {
      const a = rowA.getValue<number>(columnId) ?? 0;
      const b = rowB.getValue<number>(columnId) ?? 0;
      return a === b ? 0 : a > b ? 1 : -1;
    },
    sortDescFirst: true, // primero los Revisado (1)
    enableSorting: true,
    enableHiding: true,
    cell: ({ row }) => (
      <RevisadoToggle key={row.original.id} recibo={row.original} />
    ),
  },

  {
    id: "acciones",
    header: "Acciones",
    cell: ({ row }) => <ReciboDropdownActions recibo={row.original} />,
  },
];
