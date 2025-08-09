export class MovimientoInventarioDto {
  tipoMovimiento: string;
  nombreProducto: string;
  precioCompra: number;
  stockInicial: number;
  stockActual: number;
  usuario: string;
  cantidadMovimiendo: number;
  fecha: Date;
  observacion: string | null;
}
