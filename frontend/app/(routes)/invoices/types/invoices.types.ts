// types/invoices.types.ts - CORREGIDO: Solo cancelar en FACTURADO

export interface EstadoPedido {
  id: string;
  estado: 'GENERADO' | 'SEPARADO' | 'FACTURADO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO';
  fechaEstado: string;
  pedidoId: string;
}

export interface DetallePedido {
  id: string;
  pedidoId: string;
  productoId: string;
  cantidad: number;
  precio: number;
  producto?: {
    id: string;
    nombre: string;
    imagenUrl?: string;
    categoria?: string;
  };
}

export interface Cliente {
  id: string;
  nombre: string;
  apellidos: string;
  rasonZocial?: string;
  nit?: string;
  telefono: string;
  ciudad: string;
  correo: string;
  direccion?: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  apellidos?: string;
  correo: string;
}

// ✅ Pedido actualizado para manejar cancelaciones
export interface Pedido {
  id: string;
  clienteId: string;
  usuarioId: string;
  empresaId: string;
  total: number; // ✅ Será 0 cuando esté cancelado
  observaciones?: string;
  fechaPedido: string;
  fechaEnvio?: string;
  guiaTransporte?: string;
  flete?: number;
  actualizado?: string;
  pdfUrl?: string; // ✅ URL del PDF del pedido
  
  // ✅ Relaciones opcionales
  cliente?: Cliente;
  usuario?: Usuario;
  productos?: DetallePedido[];
  estados?: EstadoPedido[];

  // ✅ Campos adicionales para cancelación
  fechaCancelacion?: string; // ✅ Cuando fue cancelado
  motivoCancelacion?: string; // ✅ Por si quieres agregar motivos
  canceladoPor?: string; // ✅ ID del usuario que canceló
}

export interface CreatePedidoDto {
  clienteId: string;
  observaciones?: string;
  guiaTransporte?: string;
  flete?: number;
  productos: {
    productoId: string;
    cantidad: number;
    precio: number;
  }[];
}

// ✅ DTO actualizado para cancelación
export interface UpdateEstadoPedidoDto {
  pedidoId: string;
  estado: 'GENERADO' | 'SEPARADO' | 'FACTURADO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO';
  guiaTransporte?: string;
  flete?: number;
  motivoCancelacion?: string; // ✅ Opcional para cancelaciones
}

export interface FilterPedidoOptions {
  filtro: string;
  tipoFiltro: 'id' | 'clienteId' | 'usuarioId' | 'total' | 'empresaId' | 'fechaPedido';
}

// ✅ Estados con lógica corregida
export const ESTADOS_PEDIDO = {
  GENERADO: {
    label: 'Generado',
    color: 'bg-blue-100 text-blue-800',
    icon: '📝',
    description: 'Pedido creado y registrado',
    siguientes: ['SEPARADO'], // ✅ Solo puede ir a SEPARADO
  },
  SEPARADO: {
    label: 'Separado',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '📦',
    description: 'Productos separados para envío',
    siguientes: ['FACTURADO', 'CANCELADO'], // ✅ Puede ir a FACTURADO o CANCELADO
  },
  FACTURADO: {
    label: 'Facturado',
    color: 'bg-purple-100 text-purple-800',
    icon: '📄',
    description: 'Factura generada, stock descontado',
    siguientes: ['ENVIADO', 'CANCELADO'], // ✅ Puede ir a ENVIADO o CANCELADO
  },
  ENVIADO: {
    label: 'Enviado',
    color: 'bg-orange-100 text-orange-800',
    icon: '🚚',
    description: 'Pedido en tránsito',
    siguientes: ['ENTREGADO'], // ✅ NO puede cancelarse una vez enviado
  },
  ENTREGADO: {
    label: 'Entregado',
    color: 'bg-green-100 text-green-800',
    icon: '✅',
    description: 'Pedido entregado al cliente',
    siguientes: [], // ✅ Estado final
  },
  CANCELADO: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800',
    icon: '❌',
    description: 'Pedido cancelado, inventario revertido',
    siguientes: [], // ✅ Estado final
  }
} as const;

export type EstadoPedidoKey = keyof typeof ESTADOS_PEDIDO;

// ✅ Estadísticas actualizadas para incluir cancelaciones
export interface EstadisticasPedidos {
  totalPedidos: number;
  pedidosPorEstado: Record<string, number>;
  ventasTotal: number;
  ventasHoy: number;
  pedidosHoy?: number;
  pedidosCancelados?: number; // ✅ Nuevo campo
  ventasPerdidas?: number; // ✅ Ventas canceladas
  porcentajeCancelacion?: number; // ✅ % de cancelación
}

// ✅ Enum para facilitar el manejo de estados
export enum EstadoPedidoEnum {
  GENERADO = 'GENERADO',
  SEPARADO = 'SEPARADO',
  FACTURADO = 'FACTURADO',
  ENVIADO = 'ENVIADO',
  ENTREGADO = 'ENTREGADO',
  CANCELADO = 'CANCELADO'
}

// ✅ Helper para obtener estados siguientes
export const getEstadosSiguientes = (estadoActual: EstadoPedidoKey): EstadoPedidoKey[] => {
  return ESTADOS_PEDIDO[estadoActual]?.siguientes || [];
};

// ✅ CORREGIDO: Helper para verificar si puede cancelarse - SOLO EN SEPARADO Y FACTURADO
export const puedeSerCancelado = (estadoActual: EstadoPedidoKey): boolean => {
  return ['SEPARADO', 'FACTURADO'].includes(estadoActual); // ✅ SEPARADO y FACTURADO pueden cancelarse
};

// ✅ Helper para verificar si es estado final
export const esEstadoFinal = (estado: EstadoPedidoKey): boolean => {
  return ['ENTREGADO', 'CANCELADO'].includes(estado);
};

// ✅ Helper para obtener color del badge
export const getEstadoColor = (estado: EstadoPedidoKey): string => {
  return ESTADOS_PEDIDO[estado]?.color || 'bg-gray-100 text-gray-800';
};

// ✅ Interface para respuesta de cancelación
export interface CancelacionResponse {
  pedidoId: string;
  estadoAnterior: EstadoPedidoKey;
  fechaCancelacion: string;
  productosRevertidos: {
    productoId: string;
    cantidad: number;
    nombre?: string;
  }[];
  movimientosEliminados: {
    inventario: number;
    cartera: number;
  };
}

// ✅ Interface para validación de cancelación
export interface ValidacionCancelacion {
  puedeSerCancelado: boolean;
  razon?: string;
  advertencias?: string[];
  requiereConfirmacion: boolean;
}

// ✅ Filtros adicionales para pedidos cancelados
export interface FiltrosPedidosAvanzados extends FilterPedidoOptions {
  estados?: EstadoPedidoKey[];
  fechaDesde?: string;
  fechaHasta?: string;
  incluyeCancelados?: boolean;
  soloActivos?: boolean;
}

// ✅ Métricas de rendimiento
export interface MetricasPedidos {
  tiempoPromedioEntrega: number; // días
  tasaCancelacion: number; // porcentaje
  valorPromedioPedido: number;
  clientesRecurrentes: number;
  productosPopulares: {
    productoId: string;
    nombre: string;
    cantidadVendida: number;
  }[];
}