// app/invoices/types/invoices.types.ts - TIPOS CORREGIDOS

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

// ✅ Tipo más flexible que maneja la respuesta real del backend
export interface Pedido {
  id: string;
  clienteId: string;
  usuarioId: string;
  empresaId: string;
  total: number;
  observaciones?: string;
  fechaPedido: string;
  fechaEnvio?: string;
  guiaTransporte?: string;
  flete?: number;
  actualizado?: string;
  
  // ✅ Marcadas como opcionales porque tu backend puede no incluirlas
  cliente?: Cliente;
  usuario?: Usuario;
  productos?: DetallePedido[];
  estados?: EstadoPedido[];
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

export interface UpdateEstadoPedidoDto {
  pedidoId: string;
  estado: 'SEPARADO' | 'FACTURADO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO';
  guiaTransporte?: string;
  flete?: number;
}

export interface FilterPedidoOptions {
  filtro: string;
  tipoFiltro: 'id' | 'clienteId' | 'usuarioId' | 'total' | 'empresaId' | 'fechaPedido';
}

// Estados con sus colores y etiquetas
export const ESTADOS_PEDIDO = {
  GENERADO: {
    label: 'Generado',
    color: 'bg-blue-100 text-blue-800',
    icon: '📝',
    description: 'Pedido creado y registrado'
  },
  SEPARADO: {
    label: 'Separado',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '📦',
    description: 'Productos separados para envío'
  },
  FACTURADO: {
    label: 'Facturado',
    color: 'bg-purple-100 text-purple-800',
    icon: '📄',
    description: 'Factura generada, stock descontado'
  },
  ENVIADO: {
    label: 'Enviado',
    color: 'bg-orange-100 text-orange-800',
    icon: '🚚',
    description: 'Pedido en tránsito'
  },
  ENTREGADO: {
    label: 'Entregado',
    color: 'bg-green-100 text-green-800',
    icon: '✅',
    description: 'Pedido entregado al cliente'
  },
  CANCELADO: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800',
    icon: '❌',
    description: 'Pedido cancelado'
  }
} as const;

export type EstadoPedidoKey = keyof typeof ESTADOS_PEDIDO;

// ✅ Tipos adicionales para el servicio
export interface EstadisticasPedidos {
  totalPedidos: number;
  pedidosPorEstado: Record<string, number>;
  ventasTotal: number;
  ventasHoy: number;
  pedidosHoy?: number;
}