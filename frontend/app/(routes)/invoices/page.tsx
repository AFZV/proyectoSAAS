// app/invoices/page.tsx - TIPOS CORREGIDOS DEFINITIVAMENTE

import { auth } from "@clerk/nextjs";
import { getToken } from "@/lib/getToken";
import { invoicesService } from "./services/invoices.service";
import { InvoicesClient } from "./(components)/InvoicesClient/InvoiceClient";
// ✅ Usar el tipo correcto desde types
import type { Pedido } from "./types/invoices.types";

// ✅ Definir tipo para estadísticas
interface EstadisticasBackend {
  totalPedidos: number;
  pedidosPorEstado: Record<string, number>;
  ventasTotal: number;
  ventasHoy: number;
  pedidosHoy?: number;
}

export default async function InvoicesPage() {
  const { userId } = auth();

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Acceso no autorizado</h2>
          <p className="text-muted-foreground">
            Debes iniciar sesión para acceder a los pedidos
          </p>
        </div>
      </div>
    );
  }

  try {
    // Obtener token y datos del usuario
    const token = await getToken();
    const userResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/usuario-actual`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!userResponse.ok) {
      throw new Error("Error al cargar usuario");
    }

    const usuario = await userResponse.json();

    // ✅ Obtener pedidos con tipo correcto
    let pedidos: Pedido[] = [];
    try {
      // ✅ El servicio ya devuelve el tipo correcto
      pedidos = await invoicesService.obtenerPedidos(token);
    } catch (error) {
      console.error("Error al cargar pedidos:", error);
      // Continuar con array vacío si hay error
      pedidos = [];
    }

    // ✅ Obtener estadísticas con tipo correcto
    let estadisticas: EstadisticasBackend | null = null;
    try {
      estadisticas = await invoicesService.obtenerEstadisticasPedidos(token);
    } catch (error) {
      console.warn("No se pudieron cargar estadísticas:", error);
      // Estadísticas básicas como fallback
      estadisticas = {
        totalPedidos: pedidos.length,
        pedidosPorEstado: { GENERADO: pedidos.length },
        ventasTotal: 0,
        ventasHoy: 0,
        pedidosHoy: 0,
      };
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <InvoicesClient
          pedidos={pedidos}
          userType={usuario.rol}
          userName={`${usuario.nombre} ${usuario.apellidos || ""}`.trim()}
          estadisticas={estadisticas}
        />
      </div>
    );
  } catch (error) {
    console.error("Error en InvoicesPage:", error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-red-600">
            Error al cargar los pedidos
          </h2>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "Error desconocido"}
          </p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Reintentar
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }
}