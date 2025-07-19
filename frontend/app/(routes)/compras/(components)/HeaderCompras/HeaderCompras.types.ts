// app/(routes)/compras/(components)/HeaderCompras/HeaderCompras.types.ts
export interface HeaderComprasProps {
    totalComprasHoy?: number;
    valorTotalComprasHoy?: number;
    totalProveedores?: number;
    onRefresh?: () => void;
    onNuevaCompra?: () => void;
}