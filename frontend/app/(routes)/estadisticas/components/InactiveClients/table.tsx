// ————————————————————————————————————————————————————————————————
// File: app/(dashboard)/estadisticas/components/InactiveClients/table.tsx
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export type Cliente = {
  id: string;
  nit: string;
  nombre: string;
  apellidos: string;
  rasonZocial: string; // Nota: asumo que viene así del backend
  telefono: string;
  ciudad: string;
  estado: boolean;
  usuario: string;
  ultimaCompra: Date | string | null;
};

function formatFecha(d: Date | string | null) {
  if (!d) return "Sin compras";
  try {
    const date = typeof d === "string" ? new Date(d) : d;
    return new Intl.DateTimeFormat("es-CO", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(date);
  } catch {
    return "Sin compras";
  }
}

export function TableClients({ clientes }: { clientes: Cliente[] }) {
  return (
    <Table className="text-sm">
      <TableCaption className="text-xs text-muted-foreground">
        Clientes inactivos por más de 90 días
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[120px]">NIT</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead className="hidden md:table-cell">Apellidos</TableHead>
          <TableHead className="hidden lg:table-cell">Razón social</TableHead>
          <TableHead className="hidden lg:table-cell">Teléfono</TableHead>
          <TableHead className="hidden md:table-cell">Ciudad</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="hidden md:table-cell">Vendedor</TableHead>
          <TableHead>Última compra</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clientes.map((cliente) => {
          const ultima = cliente.ultimaCompra
            ? new Date(cliente.ultimaCompra)
            : null;
          const dias = ultima
            ? Math.floor(
                (Date.now() - ultima.getTime()) / (1000 * 60 * 60 * 24)
              )
            : null;
          const muyInactivo = dias !== null && dias > 180; // resaltar si > 6 meses

          return (
            <TableRow
              key={cliente.id}
              className={muyInactivo ? "bg-destructive/5" : undefined}
            >
              <TableCell className="font-mono text-xs">{cliente.nit}</TableCell>
              <TableCell className="font-medium">{cliente.nombre}</TableCell>
              <TableCell className="hidden md:table-cell">
                {cliente.apellidos}
              </TableCell>
              <TableCell className="hidden lg:table-cell truncate max-w-[200px]">
                {cliente.rasonZocial}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {cliente.telefono}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant="secondary">{cliente.ciudad}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={cliente.estado ? "default" : "outline"}>
                  {cliente.estado ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {cliente.usuario}
              </TableCell>
              <TableCell
                className={
                  muyInactivo ? "text-destructive font-medium" : undefined
                }
              >
                {formatFecha(cliente.ultimaCompra)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
