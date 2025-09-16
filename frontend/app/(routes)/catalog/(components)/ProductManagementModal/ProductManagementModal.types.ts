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
  imagenUrl?: string; // Campo opcional para actualizar imagen
  manifiestoUrl?: string; // Campo opcional para actualizar manifiesto
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
  categoriaId: string;
  imagenUrl?: string;
  manifiestoUrl?: string; // Campo opcional para actualizar manifiesto
  estado: "activo" | "inactivo";
  inventario?: Array<{
    stockActual: number;
    stockReferenciaOinicial: number;
  }>;
}

export interface Categoria {
  idCategoria: string;
  nombre: string;
}
