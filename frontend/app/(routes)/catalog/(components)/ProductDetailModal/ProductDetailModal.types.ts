import type { Producto } from "../../types/catalog.types";

export interface ProductDetailModalProps {
    producto: Producto | null;
    isOpen: boolean;
    onClose: () => void;
    onAgregarAlCarrito: (producto: Producto, cantidad: number) => void;
    isInCart?: boolean;
    cantidadEnCarrito?: number;
}