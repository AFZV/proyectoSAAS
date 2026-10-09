// app/invoices/page.tsx - TIPOS CORREGIDOS DEFINITIVAMENTE

import { auth } from "@clerk/nextjs";
import { getToken } from "@/lib/getToken";
import { invoicesService } from "./services/invoices.service";
import { InvoicesClient } from "./(components)/InvoicesClient/InvoiceClient";
// Usar el tipo correcto desde types
import type { Pedido } from "./types/invoices.types";

// Definir tipo para estadísticas
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
    // Obtener token y lanzar las 3 peticiones en paralelo — ninguna depende del
    // resultado de otra, antes se esperaban una por una y eso sumaba su latencia.
    const token = await getToken();

    const [userResult, pedidosResult, estadisticasResult] =
      await Promise.allSettled([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/usuario-actual`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }),
        invoicesService.obtenerPedidosPaginados(token, {
          pagina: 1,
          limite: 10,
        }),
        invoicesService.obtenerEstadisticasPedidos(token),
      ]);

    if (userResult.status !== "fulfilled" || !userResult.value.ok) {
      throw new Error("Error al cargar usuario");
    }

    const usuario = await userResult.value.json();

    // ✅ Obtener pedidos con tipo correcto
    let pedidos: Pedido[] = [];
    let metaInicial = null;

    if (pedidosResult.status === "fulfilled") {
      pedidos = pedidosResult.value.data;
      metaInicial = pedidosResult.value.meta;
    }

    // ✅ Obtener estadísticas con tipo correcto
    let estadisticas: EstadisticasBackend | null = null;
    if (estadisticasResult.status === "fulfilled") {
      estadisticas = estadisticasResult.value;
    } else {
      console.warn(
        "No se pudieron cargar estadísticas:",
        estadisticasResult.reason
      );
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
          metaInicial={metaInicial}
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
            <a
              href="/invoices"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Reintentar
            </a>
            <a
              href="/"
              className="inline-block px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Volver al Inicio
            </a>
          </div>
        </div>
      </div>
    );
  }
}
