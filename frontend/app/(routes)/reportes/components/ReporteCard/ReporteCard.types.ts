// app/reportes/(components)/ReporteCard/ReporteCard.types.ts

import { LucideIcon } from "lucide-react";

export interface ReporteOption {
    id: string;
    label: string;
    description?: string;
}

export interface ReporteCardData {
    id: "inventario" | "clientes" | "pedidos" | "cartera"| "recaudos"; // Identificador del tipo de reporte se agrega "recaudos"
    title: string;
    description: string;
    icon: LucideIcon;
    color: string;
    options: ReporteOption[];
}

export interface ReporteCardProps {
    data: ReporteCardData;
    onSelect: (tipo: string, opcionId: string) => void;
}