// types/invoices.types.ts - SIN ESTADO ENTREGADO - ENVIADO ES FINAL

export interface EstadoPedido {
  id: string;
  estado: "GENERADO" | "SEPARADO" | "FACTURADO" | "ENVIADO" | "CANCELADO"; // ✅ QUITADO ENTREGADO
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
  email?: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  apellidos?: string;
  correo: string;
}

// ✅ Pedido sin referencias a ENTREGADO
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
  correo?: string;

  // ✅ Relaciones opcionales
  cliente?: Cliente;
  usuario?: Usuario;
  productos?: DetallePedido[];
  estados?: EstadoPedido[];

  // ✅ Campos adicionales para cancelación
  fechaCancelacion?: string;
  motivoCancelacion?: string;
  canceladoPor?: string;
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

// ✅ DTO sin ENTREGADO
export interface UpdateEstadoPedidoDto {
  pedidoId: string;
  estado: "GENERADO" | "SEPARADO" | "FACTURADO" | "ENVIADO" | "CANCELADO"; // ✅ SIN ENTREGADO
  guiaTransporte?: string;
  flete?: number;
  motivoCancelacion?: string;
}

export interface FilterPedidoOptions {
  filtro: string;
  tipoFiltro:
    | "id"
    | "clienteId"
    | "usuarioId"
    | "total"
    | "empresaId"
    | "fechaPedido";
}

// ✅ ESTADOS SIN ENTREGADO - ENVIADO ES FINAL
export const ESTADOS_PEDIDO = {
  GENERADO: {
    label: "Generado",
    color: "bg-blue-100 text-blue-800",
    icon: "📝",
    description: "Pedido creado y registrado",
    siguientes: ["SEPARADO"], // ✅ Solo puede ir a SEPARADO
  },
  SEPARADO: {
    label: "Separado",
    color: "bg-yellow-100 text-yellow-800",
    icon: "📦",
    description: "Productos separados para envío",
    siguientes: ["FACTURADO", "CANCELADO"], // ✅ Puede ir a FACTURADO o CANCELADO
  },
  FACTURADO: {
    label: "Facturado",
    color: "bg-purple-100 text-purple-800",
    icon: "📄",
    description: "Factura generada, stock descontado",
    siguientes: ["ENVIADO", "CANCELADO"], // ✅ Puede ir a ENVIADO o CANCELADO
  },
  ENVIADO: {
    label: "Enviado",
    color: "bg-green-100 text-green-800", // ✅ CAMBIO: Ahora es verde (estado final exitoso)
    icon: "🚚",
    description: "Pedido enviado al cliente (ESTADO FINAL)", // ✅ Indicar que es final
    siguientes: [], // ✅ CAMBIO: Ya no va a ENTREGADO, es estado final
  },
  CANCELADO: {
    label: "Cancelado",
    color: "bg-red-100 text-red-800",
    icon: "❌",
    description: "Pedido cancelado, inventario revertido",
    siguientes: [], // ✅ Estado final
  },
  // ✅ ELIMINADO: ENTREGADO
} as const;

export type EstadoPedidoKey = keyof typeof ESTADOS_PEDIDO;

// ✅ Estadísticas sin referencias a ENTREGADO
export interface EstadisticasPedidos {
  totalPedidos: number;
  pedidosPorEstado: Record<string, number>;
  ventasTotal: number;
  ventasHoy: number;
  pedidosHoy?: number;
  pedidosCancelados?: number;
  ventasPerdidas?: number;
  porcentajeCancelacion?: number;
  pedidosFinalizados?: number; // ✅ ENVIADO será el equivalente a "finalizados"
}

// ✅ Enum sin ENTREGADO
export enum EstadoPedidoEnum {
  GENERADO = "GENERADO",
  SEPARADO = "SEPARADO",
  FACTURADO = "FACTURADO",
  ENVIADO = "ENVIADO", // ✅ Ahora es estado final
  CANCELADO = "CANCELADO",
  // ✅ ELIMINADO: ENTREGADO = 'ENTREGADO'
}

// ✅ Helper para obtener estados siguientes
export const getEstadosSiguientes = (
  estadoActual: EstadoPedidoKey
): EstadoPedidoKey[] => {
  return ESTADOS_PEDIDO[estadoActual]?.siguientes.slice() || [];
};

// ✅ Helper para verificar si puede cancelarse - SEPARADO y FACTURADO
export const puedeSerCancelado = (estadoActual: EstadoPedidoKey): boolean => {
  return ["SEPARADO", "FACTURADO"].includes(estadoActual);
};

// ✅ Helper para verificar si es estado final - ENVIADO y CANCELADO
export const esEstadoFinal = (estado: EstadoPedidoKey): boolean => {
  return ["ENVIADO", "CANCELADO"].includes(estado); // ✅ CAMBIO: ENVIADO ahora es final
};

// ✅ Helper para verificar si el pedido está completado exitosamente
export const esPedidoExitoso = (estado: EstadoPedidoKey): boolean => {
  return estado === "ENVIADO"; // ✅ ENVIADO = Exitoso
};

// ✅ Helper para verificar si el pedido está en proceso
export const esPedidoEnProceso = (estado: EstadoPedidoKey): boolean => {
  return ["GENERADO", "SEPARADO", "FACTURADO"].includes(estado);
};

// ✅ Helper para obtener color del badge
export const getEstadoColor = (estado: EstadoPedidoKey): string => {
  return ESTADOS_PEDIDO[estado]?.color || "bg-gray-100 text-gray-800";
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

// ✅ Filtros actualizados
export interface FiltrosPedidosAvanzados extends FilterPedidoOptions {
  estados?: EstadoPedidoKey[];
  fechaDesde?: string;
  fechaHasta?: string;
  incluyeCancelados?: boolean;
  soloActivos?: boolean;
  soloFinalizados?: boolean; // ✅ ENVIADO
}

// ✅ Métricas de rendimiento actualizadas
export interface MetricasPedidos {
  tiempoPromedioEntrega: number; // días hasta ENVIADO
  tasaCancelacion: number; // porcentaje
  valorPromedioPedido: number;
  clientesRecurrentes: number;
  productosPopulares: {
    productoId: string;
    nombre: string;
    cantidadVendida: number;
  }[];
  tasaEnvio: number; // ✅ % de pedidos que llegan a ENVIADO
}

// ✅ CONSTANTES ÚTILES
export const ESTADOS_FINALES: EstadoPedidoKey[] = ["ENVIADO", "CANCELADO"];
export const ESTADOS_ACTIVOS: EstadoPedidoKey[] = [
  "GENERADO",
  "SEPARADO",
  "FACTURADO",
];
export const ESTADOS_CON_PDF: EstadoPedidoKey[] = ["FACTURADO", "ENVIADO"]; // ✅ Desde FACTURADO ya hay PDF

// ✅ Helper para obtener descripción del estado
export const getDescripcionEstado = (estado: EstadoPedidoKey): string => {
  const estadoInfo = ESTADOS_PEDIDO[estado];
  if (!estadoInfo) return "Estado desconocido";

  if (estado === "ENVIADO") {
    return "Pedido enviado exitosamente al cliente";
  }

  return estadoInfo.description;
};

// ✅ Helper para obtener el siguiente paso lógico
export const getSiguientePasoRecomendado = (
  estado: EstadoPedidoKey
): string => {
  switch (estado) {
    case "GENERADO":
      return "Separar productos del inventario";
    case "SEPARADO":
      return "Facturar pedido para descontar stock";
    case "FACTURADO":
      return "Enviar pedido al cliente";
    case "ENVIADO":
      return "Pedido completado exitosamente";
    case "CANCELADO":
      return "Pedido cancelado, no requiere acción";
    default:
      return "Acción no definida";
  }
};
