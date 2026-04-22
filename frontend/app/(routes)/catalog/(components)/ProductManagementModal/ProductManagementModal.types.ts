// (components)/ProductManagementModal/ProductManagementModal.types.ts

export interface ProductManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated?: () => void;
}

export interface EditingProduct {
  id: string;
  nombre: string;
  precioCompra: number;
  precioVenta: number;
  categoriaId: string;
  imagenUrl: string;
  manifiestoUrl: string;
  // ── Campos nuevos ──────────────────
  referencia?: string;
  unidadesPorBulto?: number;
  pesoPorBulto?: number;
  cubicajePorBulto?: number;
  precioCompraExterior?: number;
  monedaCompraExterior?: string;
}

export interface UpdateProductoDto {
  nombre: string;
  precioCompra: number;
  precioVenta: number;
  categoriaId: string;
  imagenUrl?: string; // Campo opcional para actualizar imagen
  manifiestoUrl?: string; // Campo opcional para actualizar manifiesto
}

export interface ProductoBackend {
  id: string;
  nombre: string;
  precioCompra: number;
  precioVenta: number;
  imagenUrl: string;
  estado: string;
  categoriaId: string;
  empresaId: string;
  manifiestoUrl?: string;
  // ── Campos nuevos ──────────────────
  referencia?: string;
  unidadesPorBulto?: number;
  pesoPorBulto?: number;
  cubicajePorBulto?: number;
  precioCompraExterior?: number;
  monedaCompraExterior?: string;
  inventario?: { stockActual: number; stockReferenciaOinicial: number }[];
  imagenes?: { id: string; url: string; orden: number; activo: boolean }[];
}
export interface Categoria {
  idCategoria: string;
  nombre: string;
}
