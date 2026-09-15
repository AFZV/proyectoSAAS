"use client";

// Panel de configuración de empresa. Estructurado como una lista de "secciones" en vez de un
// formulario único, para que agregar una configuración nueva en el futuro sea solo sumar una
// entrada a SECCIONES (con su propio componente autocontenido) — no rediseñar esta pantalla.
import React, { useState } from "react";
import { Settings, FileText, MousePointerClick, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SeccionFacturacion } from "./secciones/SeccionFacturacion";

interface Seccion {
  id: string;
  label: string;
  descripcion: string;
  icon: LucideIcon;
  Componente: React.ComponentType;
}

const SECCIONES: Seccion[] = [
  {
    id: "facturacion",
    label: "Facturación",
    descripcion: "Notas y textos que se imprimen en el PDF de pedidos.",
    icon: FileText,
    Componente: SeccionFacturacion,
  },
  // Próximas configuraciones (ej. notificaciones, plantillas, integraciones) se agregan
  // aquí como una entrada más — cada una con su propio componente en ./secciones.
];

export function ConfiguracionClient() {
  // Arranca sin nada seleccionado — el panel solo se abre cuando el usuario elige una sección.
  const [seccionActivaId, setSeccionActivaId] = useState<string | null>(null);
  const seccionActiva = SECCIONES.find((s) => s.id === seccionActivaId) ?? null;
  const ActivaIcon = seccionActiva?.icon;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          Configuración de empresa
        </h1>
        <p className="text-sm text-muted-foreground">
          Ajustes que aplican a los documentos que genera tu empresa.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Lista de secciones — fila de pestañas en móvil, columna en escritorio */}
        <nav className="md:w-56 flex-shrink-0">
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
            {SECCIONES.map((s) => {
              const Icon = s.icon;
              const activa = s.id === seccionActivaId;
              return (
                <button
                  key={s.id}
                  // clic de nuevo sobre la ya abierta = la cierra (comportamiento acordeón)
                  onClick={() =>
                    setSeccionActivaId((actual) => (actual === s.id ? null : s.id))
                  }
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap text-left transition-colors flex-shrink-0",
                    activa
                      ? "bg-blue-50 text-blue-700 font-medium border border-blue-200"
                      : "text-muted-foreground hover:bg-muted border border-transparent",
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Panel de la sección activa — vacío hasta que se elija una */}
        <div className="flex-1 min-w-0 space-y-1">
          {seccionActiva && ActivaIcon ? (
            <>
              <div className="mb-3">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <ActivaIcon className="w-4 h-4 text-blue-600" />
                  {seccionActiva.label}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {seccionActiva.descripcion}
                </p>
              </div>
              <seccionActiva.Componente />
            </>
          ) : (
            <div className="border border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center text-muted-foreground gap-2">
              <MousePointerClick className="w-6 h-6" />
              <p className="text-sm">
                Selecciona una configuración de la izquierda para verla aquí.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
