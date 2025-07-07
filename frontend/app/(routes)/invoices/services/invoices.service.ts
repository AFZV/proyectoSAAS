// app/invoices/services/invoices.service.ts - ADAPTADO AL BACKEND EXISTENTE

import type {
  Pedido,
  CreatePedidoDto,
  FilterPedidoOptions,
  EstadisticasPedidos,
} from "../types/invoices.types";

export class InvoicesService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL;

  private async makeRequest<T>(
    endpoint: string,
    token: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.message || `Error ${response.status}: ${response.statusText}`
      );
    }

    return response.json();
  }

  // 📋 OBTENER PEDIDOS
  async obtenerPedidos(token: string): Promise<Pedido[]> {
    return this.makeRequest<Pedido[]>("/pedidos", token);
  }

  // 📝 CREAR PEDIDO
  async crearPedido(token: string, data: CreatePedidoDto): Promise<Pedido> {
    return this.makeRequest<Pedido>("/pedidos", token, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // 🔄 ACTUALIZAR ESTADO DE PEDIDO - USANDO LA RUTA REAL DEL BACKEND
  async actualizarEstadoPedido(
    token: string,
    pedidoId: string,
    estado: string,
    datosExtra?: { guiaTransporte?: string; flete?: number }
  ): Promise<any> {
    // ✅ Usar la ruta que realmente existe en tu backend
    return this.makeRequest("/pedidos/estado", token, {
      method: "POST",
      body: JSON.stringify({
        pedidoId,
        estado,
        // Incluir datos extra en el mismo objeto
        ...(datosExtra || {}),
      }),
    });
  }

  // ✏️ ACTUALIZAR PEDIDO COMPLETO (Solo admin)
  async actualizarPedido(
    token: string,
    pedidoId: string,
    data: Partial<CreatePedidoDto>
  ): Promise<Pedido> {
    return this.makeRequest<Pedido>(`/pedidos/${pedidoId}`, token, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // 🔍 FILTRAR PEDIDOS - USANDO GET CON BODY (como está en tu backend)
  async filtrarPedidos(
    token: string,
    filtros: {
      filtro: string;
      tipoFiltro:
        | "id"
        | "clienteId"
        | "usuarioId"
        | "total"
        | "empresaId"
        | "fechaPedido";
    }
  ): Promise<Pedido[]> {
    // Tu backend usa @Get('filtro') pero con @Body(), lo cual es técnicamente incorrecto
    // pero vamos a hacer que funcione
    return this.makeRequest<Pedido[]>("/pedidos/filtro", token, {
      method: "GET",
      body: JSON.stringify(filtros),
    });
  }

  // 📊 OBTENER ESTADÍSTICAS - CALCULADAS DESDE LOS PEDIDOS (porque no hay endpoint)
  async obtenerEstadisticasPedidos(
    token: string
  ): Promise<EstadisticasPedidos> {
    // Como tu backend no tiene endpoint de estadísticas, las calculamos
    const pedidos = await this.obtenerPedidos(token);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);

    const stats = {
      totalPedidos: pedidos.length,
      pedidosPorEstado: {} as Record<string, number>,
      ventasTotal: 0,
      ventasHoy: 0,
      pedidosHoy: 0,
    };

    // Procesar cada pedido para generar estadísticas
    pedidos.forEach((pedido: any) => {
      // Tu backend puede no incluir estados, así que manejamos ambos casos
      let estadoActual = "GENERADO";

      if (
        pedido.estados &&
        Array.isArray(pedido.estados) &&
        pedido.estados.length > 0
      ) {
        // Si tiene estados, tomar el más reciente
        const estadosOrdenados = pedido.estados.sort(
          (a: any, b: any) =>
            new Date(b.fechaEstado).getTime() -
            new Date(a.fechaEstado).getTime()
        );
        estadoActual = estadosOrdenados[0].estado;
      }

      // Contar por estado
      stats.pedidosPorEstado[estadoActual] =
        (stats.pedidosPorEstado[estadoActual] || 0) + 1;

      // Contar pedidos de hoy
      const fechaPedido = new Date(pedido.fechaPedido);
      if (fechaPedido >= hoy && fechaPedido < mañana) {
        stats.pedidosHoy++;
      }

      // Sumar ventas (solo pedidos facturados/enviados/entregados)
      if (["FACTURADO", "ENVIADO", "ENTREGADO"].includes(estadoActual)) {
        stats.ventasTotal += pedido.total || 0;

        if (fechaPedido >= hoy && fechaPedido < mañana) {
          stats.ventasHoy += pedido.total || 0;
        }
      }
    });

    return stats;
  }

  // 🔍 BUSCAR CLIENTE POR NIT (ajustar según tu backend de clientes)
  async buscarClientePorNit(token: string, nit: string): Promise<any> {
    try {
      // Ajusta esta ruta según tu backend de clientes
      return this.makeRequest(`/clientes/buscar/${nit}`, token);
    } catch (error) {
      throw new Error("Cliente no encontrado");
    }
  }

  // 📊 OBTENER PEDIDOS CON RELACIONES COMPLETAS
  // Tu backend obtenerPedidos() básico no incluye relaciones,
  // así que necesitamos hacer llamadas adicionales si es necesario
  async obtenerPedidosCompletos(token: string): Promise<Pedido[]> {
    try {
      // Primero intentamos obtener los pedidos básicos
      const pedidos = await this.obtenerPedidos(token);

      // Si los pedidos no incluyen las relaciones que necesitamos,
      // tendremos que trabajar con lo que tenemos
      return pedidos;
    } catch (error) {
      console.error("Error al obtener pedidos:", error);
      throw error;
    }
  }
}

// Instancia singleton
export const invoicesService = new InvoicesService();
