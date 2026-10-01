// app/recaudos/(components)/StatCard.tsx
"use client";
import { useState } from "react";
import { ReceiptText, Eye, EyeOff } from "lucide-react";

export function StatCard({
  title,
  value,
  description,
  color = "blue",
  ocultable = false,
}: {
  title: string;
  value: number | string;
  description: string;
  color?: "blue" | "green" | "yellow";
  // Si es true, el valor arranca oculto (••••••) y se revela con un botón tipo "ver
  // contraseña" — pensado para montos sensibles que no todos deberían ver de un vistazo.
  ocultable?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const mostrarValor = !ocultable || visible;

  const map = {
    blue: {
      txt: "text-blue-600",
      border: "border-blue-100",
      bg: "from-blue-500 to-blue-600",
    },
    green: {
      txt: "text-green-600",
      border: "border-green-100",
      bg: "from-green-500 to-green-600",
    },
    yellow: {
      txt: "text-yellow-600",
      border: "border-yellow-100",
      bg: "from-yellow-500 to-yellow-600",
    },
  }[color];

  return (
    <div className={`bg-white rounded-lg p-4 border ${map.border} shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            {title}
            {ocultable && (
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={visible ? "Ocultar valor" : "Mostrar valor"}
                title={visible ? "Ocultar" : "Mostrar"}
              >
                {visible ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </p>
          <p className={`text-2xl font-bold ${map.txt}`}>
            {mostrarValor ? value : "••••••••"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <div
          className={`w-8 h-8 bg-gradient-to-r ${map.bg} rounded-full flex items-center justify-center`}
        >
          <ReceiptText className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  );
}
