// app/reportes/(components)/FormReportes/FormReportes.types.ts

export interface FormReportesProps {
    tipo: "inventario" | "clientes" | "pedidos" | "cartera";
    opcion: string;
    onClose: () => void;
}
// Base para reportes con fechas (solo pedidos y cartera)
export interface BaseReporteData {
    formato: "excel" | "pdf";
    fechaInicio: string;
    fechaFin: string;
}

// Base para reportes sin fechas (inventario y clientes)
export interface BaseReporteSinFecha {
    formato: "excel" | "pdf";
}

// Inventario por rango (sin fechas)
export interface ReporteInventarioRango extends BaseReporteSinFecha {
    inicio: string;
    fin: string;
}

// Clientes por ciudad (sin fechas)
export interface ReporteClientesCiudad extends BaseReporteSinFecha {
    ciudad: string;
}

// Reportes con vendedor y fechas (pedidos y cartera)
export interface ReporteConVendedorConFecha extends BaseReporteData {
    vendedorId: string;
}

// Reportes con vendedor sin fechas (clientes)
export interface ReporteConVendedorSinFecha extends BaseReporteSinFecha {
    vendedorId: string;
}

// Datos del vendedor
export interface Vendedor {
    id: string;
    nombre: string;
    apellidos?: string;
}