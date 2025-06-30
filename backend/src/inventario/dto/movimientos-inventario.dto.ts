
export class MovimientoInventarioDto {
  tipoMovimiento: string;
  nombreProducto: string;
  precioCompra: number;
  usuario: string;
  cantidadMovimiendo: number;
  fecha: Date;
  observacion: string | null;
}
