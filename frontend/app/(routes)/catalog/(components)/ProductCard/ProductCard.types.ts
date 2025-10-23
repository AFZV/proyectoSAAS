import type { Producto } from "../../types/catalog.types";

export interface ProductCardProps {
  producto: Producto;
  onAgregarAlCarrito: (producto: Producto, cantidad: number) => void;
  isInCart?: boolean;
  cantidadEnCarrito?: number;
  observacion?: string;
  onChangeObservacion?: (texto: string) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

export interface AddToCartModalProps {
  producto: Producto;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cantidad: number) => void;
  observacion?: string;
  onChangeObservacion?: (texto: string) => void;
}
