export class ResumenReciboDto {
  id: string;
  cliente: string;
  fecha: Date;
  vendedor: string;
  tipo: string;
  concepto: string;

  pedidos: {
    id: string;
    total: number;
    valorAplicado: number;
    saldoPendiente: number;
  }[];

  totalPagado: number;

  // Nuevos campos para el encabezado del PDF:
  nombreEmpresa: string;
  direccionEmpresa: string;
  telefonoEmpresa: string;
  logoUrl: string;
}
