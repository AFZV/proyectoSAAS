// app/reportes/(components)/FormReportes/FormReportes.types.ts

export interface FormReportesProps {
    tipo: "inventario" | "clientes" | "pedidos" | "cartera";
    opcion: string;
    onClose: () => void;
}

export interface BaseReporteData {
    formato: "excel" | "pdf";
    fechaInicio: string;
    fechaFin: string;
}

export interface ReporteInventarioRango extends BaseReporteData {
    inicio: string;
    fin: string;
}

export interface ReporteClientesCiudad extends BaseReporteData {
    ciudad: string;
}

export interface ReporteConVendedor extends BaseReporteData {
    vendedorId: string;
}