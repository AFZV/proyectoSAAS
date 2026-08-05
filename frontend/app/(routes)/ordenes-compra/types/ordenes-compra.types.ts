export type EstadoOC = "BORRADOR" | "ENVIADA" | "CONFIRMADA" | "CANCELADA";

export interface ProveedorOC {
  idProveedor: string;
  razonsocial: string;
  identificacion: string;
  telefono?: string;
}

export interface ProductoParaOC {
  id: string;
  nombre: string;
  referencia?: string;
  imagenUrl?: string;
  precioCompra: number;
  precioCompraExterior?: number;
  monedaCompraExterior?: string;
  unidadesPorBulto?: number;
  pesoPorBulto?: number;
  cubicajePorBulto?: number;
  stock: number;
  stockReferencia?: number;
  categoria?: string;
}

export interface CartOCItem {
  productoId: string;
  nombre: string;
  referencia?: string;
  imagenUrl?: string;
  cantidad: number;
  precioUnitario: number;
  moneda: string;
  unidadesPorBulto?: number;
}

export interface OrdenCompraResumen {
  id: string;
  proveedorId: string;
  proveedor: { razonsocial: string; identificacion: string };
  fechaCreacion: string;
  estado: EstadoOC;
  observaciones?: string;
  totalProductos: number;
}

export interface CreateOrdenCompraPayload {
  proveedorId: string;
  observaciones?: string;
  detalles: {
    productoId: string;
    cantidad: number;
    precioUnitario: number;
    moneda: string;
  }[];
}
