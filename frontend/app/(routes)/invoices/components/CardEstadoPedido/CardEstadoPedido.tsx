"use client";

import { LucideIcon, ClockIcon, CheckIcon } from "lucide-react";
import Link from "next/link";

// Orden lógico de los estados
const ESTADOS = ["generado", "separado", "facturado", "enviado"];

// Función para mapear títulos a claves de estado
function tituloAEstado(titulo: string): string {
  return titulo
    .replace("Pedido ", "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // elimina acentos si hay
}

export function CardEstadoPedido({
  icono: Icono,
  titulo,
  descripcion,
  fecha,
  colorIcono,
  completado,
}: {
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
  fecha?: string;
  colorIcono: string;
  completado?: boolean;
}) {
  const IconoEstado = completado ? CheckIcon : ClockIcon;

  return (
    <div className="max-w-sm rounded overflow-hidden shadow-lg">
      <div className="px-6 py-4">
        <div className="flex justify-end mb-2">
          <IconoEstado
            size={28}
            className={completado ? "text-green-500" : "text-yellow-500"}
          />
        </div>
        <div className="flex items-center justify-center">
          <Icono size="80%" color={colorIcono} />
        </div>
        <div className="font-bold text-xl mb-2 text-center">{titulo}</div>
        <p className="text-gray-700 text-base text-center">{descripcion}</p>
      </div>
      <div className="px-6 pt-4 pb-2 text-center">
        {completado && titulo === "Pedido Enviado" && (
          <div className="mb-2">
            <p className="text-sm font-medium text-gray-700">Número de guía:</p>
            <a
              href="https://aldialogistica.com/rastreo/"
              target="_blank"
              className="text-blue-600 underline text-sm"
              rel="noopener noreferrer"
            >
              Rastrear pedido
            </a>
          </div>
        )}
        {fecha && (
          <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mt-3">
            {fecha}
          </span>
        )}
      </div>
    </div>
  );
}
