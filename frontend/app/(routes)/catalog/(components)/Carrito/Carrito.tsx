import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductProps } from "@/components/CardProduct/CardProduct.type";
import { Button } from "@/components/ui/button";

import { TrashIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatValue } from "@/utils/FormartValue";
import { Input } from "@/components/ui/input";

export function Carrito({
  carrito,
  total,
  handleEliminar,
  observacion,
  setObservacion,
}: {
  carrito: (ProductProps & { cantidad: number })[];
  total: number;
  handleEliminar: (index: number) => void; //esto para eloiminar el producto de acuero al indice
  observacion: string;
  setObservacion: (value: string) => void;
}) {
  return (
    <div className="max-h-screen- overflow-y-auto overflow-x-auto">
      <Table>
        <TableCaption>
          Observación
          <Input
            placeholder="Observacion del pedido"
            className="mb-3"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
          ></Input>
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Item</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Cantidad</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead className="text-right">Subtotal</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {carrito.map((producto, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>{producto.nombre}</TableCell>
              <TableCell>{producto.cantidad}</TableCell>
              <TableCell className="text-right">${producto.precio}</TableCell>
              <TableCell className="text-right">
                {formatValue(producto.precio * producto.cantidad)}
              </TableCell>
              <TableCell className="text-right">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="destructive"
                        onClick={() => handleEliminar(index)}
                      >
                        <TrashIcon />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Eliminar</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4} className="text-right font-bold">
              Total:
            </TableCell>
            <TableCell className="text-right font-bold">
              {formatValue(total)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
