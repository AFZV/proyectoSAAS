// app/(routes)/inventario/(components)/HeaderInventario/HeaderInventario.types.ts
export interface HeaderInventarioProps {
    totalProductos?: number;
    valorTotalInventario?: number;
    productosStockBajo?: number;
    onRefresh?: () => void;
}