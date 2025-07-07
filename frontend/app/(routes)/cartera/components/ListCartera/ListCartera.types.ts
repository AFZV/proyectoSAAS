export type ClienteCartera = {
  id: string;
  nit: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  ciudad: string;
  email?: string;
  usuario: string;
  balance: number;
};

export type MovimientoCartera = {
  idMovimientoCartera: string;
  valorMovimiento: number;
  fechaMovimientoCartera: string;
  observacion?: string;
  tipoMovimientoOrigen?: "PEDIDO" | "RECIBO" | "AJUSTE_MANUAL";
  cliente: {
    id: string;
    nombre: string;
    apellidos: string;
    nit: string;
  };
  usuario: {
    id: string;
    nombre: string;
    apellidos: string;
  };
  pedido?: {
    id: string;
    total: number;
    fechaPedido: string;
  };
  recibo?: {
    id: string;
    tipo: string;
    concepto: string;
    Fechacrecion: string;
  };
};
