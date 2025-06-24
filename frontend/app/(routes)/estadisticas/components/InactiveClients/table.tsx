import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type Cliente = {
  id: string;
  nit: string;
  nombre: string;
  apellidos: string;
  rasonZocial: string;
  telefono: string;
  ciudad: string;
  estado: boolean;
  usuario: string;
  ultimaCompra: Date | null;
};

export function TableClients({ clientes }: { clientes: Cliente[] }) {
  return (
    <Table>
      <TableCaption>Clientes inactivos por mas de 90 dias</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">NIT</TableHead>
          <TableHead>NOMBRE</TableHead>
          <TableHead>APELLIDOS</TableHead>
          <TableHead>RAZON SOCIAL</TableHead>
          <TableHead>TELEFONO</TableHead>
          <TableHead>CIUDAD</TableHead>
          <TableHead>ESTADO</TableHead>
          <TableHead>VENDEDOR</TableHead>
          <TableHead>ULTIMA COMPRA</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clientes.map((cliente) => (
          <TableRow key={cliente.id}>
            <TableCell className="font-medium">{cliente.nit}</TableCell>
            <TableCell className="font-medium">{cliente.nombre}</TableCell>
            <TableCell>{cliente.apellidos}</TableCell>
            <TableCell>{cliente.rasonZocial}</TableCell>
            <TableCell>{cliente.telefono}</TableCell>
            <TableCell className="font-medium">{cliente.ciudad}</TableCell>
            <TableCell> {cliente.estado ? "Activo" : "Inactivo"}</TableCell>
            <TableCell>{cliente.usuario}</TableCell>
            <TableCell>
              {cliente.ultimaCompra
                ? new Date(cliente.ultimaCompra).toLocaleDateString("es-CO")
                : "Sin compras"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
