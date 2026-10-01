"use client";

// Error Boundary genérico. Sin esto, cualquier excepción durante el render (ej. llamar
// .toLocaleString() sobre un valor que resultó null/undefined) desmonta TODO el árbol de
// React y deja la pantalla en blanco, sin ningún mensaje — React no tiene un comportamiento
// por defecto más amable que ese. Usar para envolver flujos puntuales (un modal, un formulario)
// donde un error inesperado no debería tumbar toda la pantalla, solo esa parte.
import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  // Mensaje mostrado al usuario; el título es siempre "Algo salió mal".
  description?: string;
  // Se llama cuando el usuario pulsa "Reintentar" — típicamente para cerrar el modal.
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary capturó un error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center text-center gap-3 py-10 px-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Algo salió mal</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {this.props.description ??
              "Ocurrió un error inesperado. Puedes cerrar esto e intentarlo de nuevo."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              this.setState({ error: null });
              this.props.onReset?.();
            }}
          >
            Cerrar
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
