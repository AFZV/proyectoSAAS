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
}

export interface UpdateProductoDto {
    nombre: string;
    precioCompra: number;
    precioVenta: number;
    categoriaId: string;
}