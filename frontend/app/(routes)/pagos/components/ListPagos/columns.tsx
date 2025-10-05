"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Trash, Trash2, X } from "lucide-react";
import { ArrowUpDown, Eye, MoreHorizontal } from "lucide-react";
import { ColumnDef, type Column } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { formatValue } from "@/utils/FormartValue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
export type ProveedorConSaldo = {
  idProveedor: string;
  razonsocial: string;
  identificacion?: string;
  direccion?: string;
  telefono?: string;
  saldoPendiente: number; // ← agregado
  moneda?: string;
};

function ProveedorDetalles({
  proveedor,
  onClose,
}: {
  proveedor: ProveedorConSaldo;
  onClose: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
          <div>
            <label className="text-sm text-muted-foreground">Proveedor</label>
            <p className="text-lg font-semibold">{proveedor.razonsocial}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">NIT</label>
            <p className="font-mono">{proveedor.identificacion ?? "—"}</p>
          </div>
        </div>
        <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
          <div>
            <label className="text-sm text-muted-foreground">Teléfono</label>
            <p className="font-mono">{proveedor.telefono ?? "—"}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Direccion</label>
            <p>{proveedor.direccion ?? "—"}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">
              Saldo pendiente
            </label>
            <p className="font-semibold">
              {formatValue(proveedor.saldoPendiente)},
            </p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Moneda</label>
            <p className="font-bold">{proveedor.moneda},</p>
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="inline-flex h-9 items-center justify-center rounded-md border border-blue-500 px-3 text-sm font-medium text-blue-600 hover:bg-blue-50"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
export type MovimientoProveedor = {
  id: string;
  fecha: string | Date;
  tipo: "Factura" | "Pago" | "Nota crédito" | "Ajuste";
  numero: string;
  monto: number; // positivo para facturas/ajustes de débito, negativo para pagos/notas crédito
  saldo: number; // saldo resultante luego del movimiento
  descripcion?: string; // descripción del pago, si aplica
  vencimiento?: string | Date; // fecha de vencimiento, si aplica
};
function getTipoBadgeVariant(tipo: MovimientoProveedor["tipo"]) {
  // Variantes con énfasis en tu acento azul
  switch (tipo) {
    case "Factura":
      return "default"; // gris/neutral por defecto
    case "Pago":
      return "outline"; // contorno (azul en hover)
    case "Nota crédito":
      return "secondary";
    case "Ajuste":
      return "destructive"; // rojo suave (puedes cambiar a "secondary" si prefieres)
    default:
      return "outline";
  }
}
type Props = {
  proveedor: ProveedorConSaldo;
  movimientos: MovimientoProveedor[]; // pásalo desde tu data real
  onClose?: () => void;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? ""; // ej: https://api.bgacloudsaas.com

function getDeleteConfig(m: MovimientoProveedor) {
  switch (m.tipo) {
    case "Pago":
      return {
        url: `${API}/pagos-proveedor/delete/${m.id}`,
        entity: "pago",
        confirmText: `¿Eliminar el pago ${m.numero}?`,
        method: "DELETE" as const,
      };
    case "Factura":
      return {
        url: `${API}/facturas-proveedor/delete/${m.id}`,
        entity: "factura",
        confirmText: `¿Eliminar la factura ${m.numero}?`,
        method: "DELETE" as const,
      };
    // Opcional: mapea otros tipos si tienes endpoints definidos

    default:
      throw new Error("Tipo de movimiento no soportado");
  }
}
export default function ProveedorVerHistory({
  proveedor,
  movimientos,
  onClose,
}: Props) {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { getToken } = useAuth();
  const router = useRouter();
  const handleEliminar = async (m: MovimientoProveedor) => {
    const cfg = getDeleteConfig(m);

    // Confirmación
    if (!window.confirm(cfg.confirmText)) return;

    try {
      setDeletingId(m.id);
      const token = await getToken();

      const res = await fetch(cfg.url, {
        method: cfg.method,
        headers: {
          Authorization: `Bearer ${token}`,
          //"Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Error ${res.status}`);
      }

      // toast.success(`Se eliminó el ${cfg.entity} ${m.numero}`);
      // TODO: refrescar la lista (puedes levantar un estado o disparar un refetch)
      // Por ejemplo, si te pasan un onDeleted:
      // onDeleted?.(m.id);
      toast({
        title: `Se eliminó el ${cfg.entity} ${m.numero}`,
        duration: 2000,
      });
      window.location.reload();
    } catch (e: any) {
      toast({
        title: `No se pudo eliminar el ${cfg.entity} ${m.numero}. ${
          e?.message?.slice(0, 200) ?? ""
        }`,
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header de info del proveedor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-blue-100/60 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Proveedor</label>
              <p className="text-lg font-semibold tracking-tight">
                {proveedor.razonsocial}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">
                  Identificación
                </label>
                <p className="font-mono text-sm">
                  {proveedor.identificacion ?? "—"}
                </p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Teléfono
                </label>
                <p className="font-mono text-sm">{proveedor.telefono ?? "—"}</p>
              </div>

              <div>
                <label className="text-md text-muted-foreground">Moneda</label>
                <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  {proveedor.moneda ?? "—"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-100/60 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Dirección</label>
              <p className="text-sm">{proveedor.direccion ?? "—"}</p>
            </div>
            <Separator />
            <div>
              <label className="text-xs text-muted-foreground">
                Saldo pendiente
              </label>
              <p
                className={cn(
                  "text-xl font-bold tabular-nums",
                  proveedor.saldoPendiente > 0
                    ? "text-blue-700"
                    : proveedor.saldoPendiente < 0
                    ? "text-green-600"
                    : "text-muted-foreground"
                )}
              >
                {typeof (globalThis as any).formatValue === "function"
                  ? (globalThis as any).formatValue(proveedor.saldoPendiente)
                  : formatValue(proveedor.saldoPendiente)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historial */}
      <Card className="border-blue-100/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-blue-700">
            Historial de movimientos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-blue-50/70 backdrop-blur border-b border-blue-100">
              <TableRow>
                <TableHead className="text-left text-xs font-medium text-blue-600 uppercase">
                  Fecha
                </TableHead>
                <TableHead className="text-left text-xs font-medium text-blue-600 uppercase">
                  Vencimiento
                </TableHead>
                <TableHead className="text-left text-xs font-medium text-blue-600 uppercase">
                  Tipo
                </TableHead>
                <TableHead className="text-left text-xs font-medium text-blue-600 uppercase">
                  Descripción
                </TableHead>
                <TableHead className="text-left text-xs font-medium text-blue-600 uppercase">
                  Número
                </TableHead>
                <TableHead className="text-right text-xs font-medium text-blue-600 uppercase">
                  Monto
                </TableHead>
                <TableHead className="text-right text-xs font-medium text-blue-600 uppercase">
                  Saldo
                </TableHead>

                <TableHead className="text-right text-xs font-medium text-red-600 uppercase">
                  Eliminar
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {movimientos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center">
                    <div className="text-sm text-muted-foreground">
                      No hay movimientos registrados para este proveedor.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                movimientos.map((m) => {
                  const fecha =
                    typeof m.fecha === "string"
                      ? new Date(m.fecha)
                      : (m.fecha as Date);
                  const montoPositivo = m.monto > 0;
                  const esPagoONota = m.monto < 0;
                  const vencimiento = m.vencimiento;

                  return (
                    <TableRow
                      key={m.id}
                      className="hover:bg-blue-50/40 odd:bg-muted/20 even:bg-background transition-colors"
                    >
                      <TableCell className="p-2 align-middle text-sm whitespace-nowrap">
                        {fecha.toLocaleDateString("es-CO", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="p-2 align-middle text-sm whitespace-nowrap">
                        {vencimiento?.toLocaleString("es-CO", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </TableCell>

                      <TableCell className="p-2 align-middle">
                        <Badge
                          variant={getTipoBadgeVariant(m.tipo)}
                          className={cn(
                            "rounded-md",
                            m.tipo === "Factura" &&
                              "bg-green-200 text-green-800",
                            m.tipo === "Pago" &&
                              "border-red-300 text-red-700 hover:bg-red-50",
                            m.tipo === "Nota crédito" &&
                              "bg-blue-50 text-blue-800",
                            m.tipo === "Ajuste" && "bg-red-50 text-red-700"
                          )}
                        >
                          {m.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="p-2 align-middle text-sm">
                        {m.descripcion ? (
                          <span className="italic text-muted-foreground">
                            {m.descripcion}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="p-2 align-middle text-sm">
                        <span className="font-mono">{m.numero}</span>
                      </TableCell>

                      <TableCell
                        className={cn(
                          "p-2 align-middle text-right tabular-nums font-semibold",
                          esPagoONota
                            ? "text-red-700"
                            : montoPositivo
                            ? "text-green-700"
                            : "text-muted-foreground"
                        )}
                      >
                        {typeof (globalThis as any).formatValue === "function"
                          ? (globalThis as any).formatValue(m.monto)
                          : formatValue(m.monto)}
                      </TableCell>

                      <TableCell className="p-2 align-middle text-right tabular-nums">
                        {typeof (globalThis as any).formatValue === "function"
                          ? (globalThis as any).formatValue(m.saldo)
                          : formatValue(m.saldo)}
                      </TableCell>

                      <TableCell className="p-2 align-middle text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-800"
                                onClick={() => handleEliminar(m)}
                                title="Eliminar"
                                disabled={deletingId === m.id}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>Eliminar</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          className="border-blue-500 text-blue-600 hover:bg-blue-50"
          onClick={onClose}
        >
          <X className="mr-2 h-4 w-4" />
          Cerrar
        </Button>
      </div>
    </div>
  );
}
import { useAuth } from "@clerk/nextjs";
//import { getToken } from "@/lib/getToken";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
function ProveedorActions({ proveedor }: { proveedor: ProveedorConSaldo }) {
  const [open, setOpen] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);
  const [movimientos, setMovimientos] = useState<MovimientoProveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const { getToken } = useAuth();

  const fetchMovimientos = async () => {
    try {
      setLoading(true);
      const token = await getToken(); // ⚠️ si esta función es server-only, ver nota abajo
      const url = `${process.env.NEXT_PUBLIC_API_URL}/facturas-proveedor/movimientos/${proveedor.idProveedor}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error(
          "Error fetching movimientos:",
          res.status,
          await res.text()
        );
        return;
      }

      const data = await res.json();
      setMovimientos(data);
    } catch (e) {
      console.error("fetchMovimientos error:", e);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 dispara la carga sólo cuando abres el historial
  useEffect(() => {
    if (openHistory) {
      fetchMovimientos();
    }
  }, [openHistory, proveedor.idProveedor]);

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
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Ver detalles
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenHistory(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Ver Historial
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              Detalles del Proveedor
            </DialogTitle>
            <DialogDescription>
              Información de {proveedor.razonsocial}
            </DialogDescription>
          </DialogHeader>
          <ProveedorDetalles
            proveedor={proveedor}
            onClose={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={openHistory} onOpenChange={setOpenHistory}>
        <DialogContent className="max-w-5xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              Historial de pagos
            </DialogTitle>
            <DialogDescription>
              Historial de pagos y Facturas {proveedor.razonsocial}
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">
              Cargando movimientos…
            </div>
          ) : (
            <ProveedorVerHistory
              proveedor={proveedor}
              movimientos={movimientos}
              onClose={() => setOpenHistory(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export const columns: ColumnDef<ProveedorConSaldo>[] = [
  {
    accessorKey: "razonsocial",
    header: ({ column }: { column: Column<ProveedorConSaldo, unknown> }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 px-2 lg:px-3"
      >
        Proveedor
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const nombre = row.original.razonsocial;
      const nit = row.original.identificacion;
      return (
        <div className="space-y-1">
          <div className="font-medium">{nombre}</div>
          {nit && (
            <div className="text-xs text-muted-foreground">NIT {nit}</div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "direccion",
    header: "Dirección",
    cell: ({ row }) => (
      <span className="font-mono">{row.original.direccion ?? "—"}</span>
    ),
  },

  {
    accessorKey: "telefono",
    header: "Teléfono",
    cell: ({ row }) => (
      <span className="font-mono">{row.original.telefono ?? "—"}</span>
    ),
  },
  {
    accessorKey: "saldoPendiente",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 px-2 lg:px-3"
      >
        Saldo pendiente
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      return (
        <span className="font-semibold text-foreground">
          {formatValue(row.original.saldoPendiente)}
        </span>
      );
    },
  },
  {
    accessorKey: "moneda",
    header: "Moneda",
    cell: ({ row }) => (
      <Badge className="font-mono text-white">
        {row.original.moneda ?? "—"}
      </Badge>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-right">Acciones</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <ProveedorActions proveedor={row.original} />
      </div>
    ),
  },
];
