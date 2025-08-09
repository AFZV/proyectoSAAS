import { CustomIcon } from "@/components/CustomIcon";
import { Notebook, MoreVertical, Eye } from "lucide-react";
import { formatValue } from "@/utils/FormartValue";
// ✅ Agregar el import de Link
import Link from "next/link";

// Solo tipos necesarios para los datos del backend
interface Cliente {
  nombre?: string;
  apellidos?: string;
  rasonZocial?: string;
}

interface Estado {
  estado: string;
  fechaEstado: string;
}

interface Pedido {
  id: string;
  total: number;
  fechaPedido: string;
  cliente?: Cliente;
  estados?: Estado[];
}

interface LastOrdersProps {
  pedidos?: Pedido[];
}

export function LastOrders({ pedidos = [] }: LastOrdersProps) {
  // Solo funciones necesarias para mostrar datos reales
  const getNombreCliente = (cliente?: Cliente) => {
    if (!cliente) return "Cliente no disponible";
    if (cliente.rasonZocial) return cliente.rasonZocial;
    if (cliente.nombre && cliente.apellidos)
      return `${cliente.nombre} ${cliente.apellidos}`;
    if (cliente.nombre) return cliente.nombre;
    return "Cliente no disponible";
  };

  const getInitials = (nombre: string) => {
    return nombre
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getEstadoColor = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case "completado":
      case "entregado":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "pendiente":
      case "en_proceso":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "cancelado":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    }
  };

  const avatarColors = [
    "from-blue-500 to-purple-600",
    "from-green-500 to-blue-600",
    "from-purple-500 to-pink-600",
    "from-orange-500 to-red-600",
  ];

  // ✅ Si hay datos del backend, usarlos. Si no, datos mock originales
  const pedidosParaMostrar =
    pedidos.length > 0
      ? pedidos
      : [
          {
            id: "1234",
            total: 125000,
            fechaPedido: "2025-06-11",
            cliente: { nombre: "Juan", apellidos: "Pérez" },
            estados: [{ estado: "Completado", fechaEstado: "2025-06-11" }],
          },
          {
            id: "1235",
            total: 89500,
            fechaPedido: "2025-06-10",
            cliente: { nombre: "María", apellidos: "García" },
            estados: [{ estado: "Pendiente", fechaEstado: "2025-06-10" }],
          },
          {
            id: "1236",
            total: 250000,
            fechaPedido: "2025-06-09",
            cliente: { nombre: "Carlos", apellidos: "Rodriguez" },
            estados: [{ estado: "En Proceso", fechaEstado: "2025-06-09" }],
          },
          {
            id: "1237",
            total: 175750,
            fechaPedido: "2025-06-08",
            cliente: { nombre: "Laura", apellidos: "Silva" },
            estados: [{ estado: "Completado", fechaEstado: "2025-06-08" }],
          },
        ];

  return (
    <div className="bg-card border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Notebook
              className="h-4 w-4 text-purple-600 dark:text-purple-400"
              strokeWidth={1.5}
            />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">
              Últimos Pedidos
            </h3>
            <p className="text-xs text-muted-foreground">Actividad reciente</p>
          </div>
        </div>
        <button className="p-1 hover:bg-muted rounded transition-colors">
          <MoreVertical className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>

      {/* ✅ Lista de Pedidos */}
      <div className="space-y-3">
        {pedidosParaMostrar.slice(0, 4).map((pedido, index) => {
          const nombreCliente = getNombreCliente(pedido.cliente);
          const estadoActual = pedido.estados?.[0]?.estado || "pendiente";

          return (
            <div
              key={pedido.id}
              className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors group"
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <div
                  className={`w-6 h-6 bg-gradient-to-br ${
                    avatarColors[index % avatarColors.length]
                  } rounded-full flex items-center justify-center flex-shrink-0`}
                >
                  <span className="text-white text-xs font-semibold">
                    {getInitials(nombreCliente)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {nombreCliente}
                  </p>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-muted-foreground">
                      #{pedido.id.slice(5)}
                    </span>
                    <span
                      className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full ${getEstadoColor(
                        estadoActual
                      )}`}
                    >
                      {estadoActual}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-semibold text-foreground">
                  {formatValue(pedido.total)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(pedido.fechaPedido).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ✅ Ver Todos - CORREGIDO */}
      <div className="mt-4 pt-3 border-t border-border">
        <Link
          href="/invoices"
          className="block w-full text-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
        >
          Ver todos los pedidos →
        </Link>
      </div>
    </div>
  );
}
