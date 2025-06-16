export class ResumenReciboDto {
  id: string; // ID del recibo
  cliente: string; // Nombre completo o razón social del cliente
  fecha: Date; // Fecha de creación del recibo
  vendedor: string; // Nombre del usuario que generó el recibo
  tipo: string; // Tipo de pago (efectivo, transferencia, etc.)
  concepto: string; // Concepto del recibo

  pedidos: {
    id: string; // ID del pedido
    total: number; // Total del pedido
    valorAplicado: number; // Monto pagado en este recibo
    saldoPendiente: number; // Lo que queda por pagar después del abono
  }[];

  totalPagado: number; // Suma de los valores aplicados a todos los pedidos
}
