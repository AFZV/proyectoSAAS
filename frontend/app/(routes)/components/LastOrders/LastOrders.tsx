import { CustomIcon } from "@/components/CustomIcon";
import { Notebook, MoreVertical, Eye } from "lucide-react";
import { formatValue } from "@/utils/FormartValue";

// Datos de ejemplo - luego esto vendrá del backend
const pedidosEjemplo = [
  {
    id: "PD001",
    cliente: "Juan Pérez",
    total: 150000,
    fecha: "2025-06-07",
    estado: "Completado"
  },
  {
    id: "PD002", 
    cliente: "María González",
    total: 280000,
    fecha: "2025-06-07",
    estado: "Pendiente"
  },
  {
    id: "PD003",
    cliente: "Carlos López",
    total: 95000,
    fecha: "2025-06-06",
    estado: "Completado"
  }
];

export function LastOrders() {
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "Completado":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "Pendiente":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "En Proceso":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  return (
    <div className="bg-card border rounded-xl p-4">
      {/* Header Compacto */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Notebook className="h-4 w-4 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">Últimos Pedidos</h3>
            <p className="text-xs text-muted-foreground">Actividad reciente</p>
          </div>
        </div>
        <button className="p-1 hover:bg-muted rounded transition-colors">
          <MoreVertical className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>

      {/* Lista de Pedidos Compacta */}
      <div className="space-y-3">
        {pedidosEjemplo.map((pedido) => (
          <div 
            key={pedido.id}
            className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors group"
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {/* Avatar Pequeño */}
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-semibold">
                  {pedido.cliente.split(' ').map(n => n[0]).join('').slice(0,1)}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {pedido.cliente}
                </p>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-muted-foreground">{pedido.id}</span>
                  <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full ${getEstadoColor(pedido.estado)}`}>
                    {pedido.estado}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-semibold text-foreground">
                {formatValue(pedido.total)}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(pedido.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Ver Todos - Compacto */}
      <div className="mt-4 pt-3 border-t border-border">
        <button className="w-full text-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors">
          Ver todos los pedidos →
        </button>
      </div>
    </div>
  );
}