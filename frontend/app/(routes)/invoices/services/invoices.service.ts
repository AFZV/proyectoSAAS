// services/invoices.service.ts - ACTUALIZADO PARA CANCELACIÓN

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
    console.log(`🌐 Haciendo request a: ${this.baseUrl}${endpoint}`);
    console.log("📦 Opciones:", options);

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });

    console.log(`📡 Respuesta: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("❌ Error en response:", error);
      throw new Error(
        error.message || `Error ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("✅ Datos recibidos:", data);
    return data;
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

  // 🔄 ACTUALIZAR ESTADO DE PEDIDO - MEJORADO PARA CANCELACIÓN
  async actualizarEstadoPedido(
    token: string,
    pedidoId: string,
    data: {
      estado: string;
      guiaTransporte?: string;
      flete?: number;
    }
  ): Promise<any> {
    console.log("🔄 Actualizando estado del pedido:");
    console.log("📋 Datos enviados:", {
      pedidoId,
      estado: data.estado,
      guiaTransporte: data.guiaTransporte,
      flete: data.flete,
    });

    // ✅ PREPARAR PAYLOAD SEGÚN EL BACKEND
    const payload = {
      pedidoId,
      estado: data.estado,
      guiaTransporte: data.guiaTransporte || "", // ✅ Backend espera string
      flete: data.flete || 0, // ✅ Backend espera number
    };

    console.log("📤 Payload final:", payload);

    try {
      const result = await this.makeRequest(
        "/pedidos/estado", // ✅ Endpoint correcto según tu controller
        token,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      console.log("✅ Estado actualizado exitosamente:", result);
      return result;
    } catch (error) {
      console.error("❌ Error al actualizar estado:", error);
      throw error;
    }
  }

  // ✏️ ACTUALIZAR PEDIDO COMPLETO
  async actualizarPedido(
    token: string,
    pedidoId: string,
    data: Partial<CreatePedidoDto>
  ): Promise<Pedido> {
    console.log("📝 Actualizando pedido completo:", { pedidoId, data });

    return this.makeRequest<Pedido>(`/pedidos/${pedidoId}`, token, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // 🚫 CANCELAR PEDIDO - NUEVA FUNCIÓN ESPECÍFICA
  async cancelarPedido(token: string, pedidoId: string): Promise<any> {
    console.log("🚫 Cancelando pedido:", pedidoId);

    try {
      const result = await this.actualizarEstadoPedido(token, pedidoId, {
        estado: "CANCELADO",
        guiaTransporte: "",
        flete: 0,
      });

      console.log("✅ Pedido cancelado exitosamente:", result);
      return result;
    } catch (error) {
      console.error("❌ Error al cancelar pedido:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "No se pudo cancelar el pedido"
      );
    }
  }

  // 🔍 FILTRAR PEDIDOS - CORREGIDO PARA USAR QUERY PARAMS
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
    console.log("🔍 Filtrando pedidos:", filtros);

    // ✅ USAR QUERY PARAMETERS - PERO VERIFICAR SI BACKEND ESPERA BODY
    // Según tu controller, usa @Body(), así que enviamos en el body
    return this.makeRequest<Pedido[]>("/pedidos/filtro", token, {
      method: "GET", // ✅ Cambiar a POST si tu backend espera body
      body: JSON.stringify(filtros),
    });
  }

  // 📊 OBTENER ESTADÍSTICAS - MEJORADO PARA INCLUIR CANCELADOS
  async obtenerEstadisticasPedidos(
    token: string
  ): Promise<EstadisticasPedidos> {
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
      pedidosCancelados: 0, // ✅ Nuevo campo
      ventasPerdidas: 0, // ✅ Nuevo campo para ventas canceladas
    };

    pedidos.forEach((pedido: any) => {
      let estadoActual = "GENERADO";

      if (
        pedido.estados &&
        Array.isArray(pedido.estados) &&
        pedido.estados.length > 0
      ) {
        const estadosOrdenados = pedido.estados.sort(
          (a: any, b: any) =>
            new Date(b.fechaEstado).getTime() -
            new Date(a.fechaEstado).getTime()
        );
        estadoActual = estadosOrdenados[0].estado;
      }

      // ✅ Contar por estado
      stats.pedidosPorEstado[estadoActual] =
        (stats.pedidosPorEstado[estadoActual] || 0) + 1;

      const fechaPedido = new Date(pedido.fechaPedido);

      // ✅ Pedidos de hoy
      if (fechaPedido >= hoy && fechaPedido < mañana) {
        stats.pedidosHoy++;
      }

      // ✅ Estadísticas de ventas (solo pedidos no cancelados)
      if (["FACTURADO", "ENVIADO", "ENTREGADO"].includes(estadoActual)) {
        stats.ventasTotal += pedido.total || 0;

        if (fechaPedido >= hoy && fechaPedido < mañana) {
          stats.ventasHoy += pedido.total || 0;
        }
      }

      // ✅ Estadísticas de cancelaciones
      if (estadoActual === "CANCELADO") {
        stats.pedidosCancelados++;
        // Nota: pedido.total ya debería ser 0 según el backend,
        // pero podríamos necesitar el total original para estadísticas
      }
    });

    return stats;
  }

  // 🔍 BUSCAR CLIENTE POR NIT
  async buscarClientePorNit(token: string, nit: string): Promise<any> {
    try {
      return this.makeRequest(`/clientes/buscar/${nit}`, token);
    } catch (error) {
      throw new Error("Cliente no encontrado");
    }
  }

  // 📊 OBTENER PEDIDOS CON RELACIONES COMPLETAS
  async obtenerPedidosCompletos(token: string): Promise<Pedido[]> {
    try {
      const pedidos = await this.obtenerPedidos(token);
      return pedidos;
    } catch (error) {
      console.error("Error al obtener pedidos:", error);
      throw error;
    }
  }

  // 🔍 VERIFICAR SI PEDIDO PUEDE SER CANCELADO
  verificarPuedeCancelar(pedido: Pedido): { puede: boolean; razon?: string } {
    if (!pedido.estados || pedido.estados.length === 0) {
      return { puede: true }; // GENERADO puede cancelarse
    }

    const estadoActual = pedido.estados
      .sort((a, b) =>
        new Date(b.fechaEstado).getTime() - new Date(a.fechaEstado).getTime()
      )[0].estado;

    switch (estadoActual) {
      case "GENERADO":
      case "SEPARADO":
      case "FACTURADO":
        return { puede: true };

      case "ENVIADO":
        return {
          puede: false,
          razon: "No se puede cancelar un pedido que ya fue enviado"
        };

      case "ENTREGADO":
        return {
          puede: false,
          razon: "No se puede cancelar un pedido que ya fue entregado"
        };

      case "CANCELADO":
        return {
          puede: false,
          razon: "El pedido ya está cancelado"
        };

      default:
        return {
          puede: false,
          razon: "Estado no reconocido"
        };
    }
  }

  // 📊 OBTENER RESUMEN DE MOVIMIENTOS POR CANCELACIÓN
  async obtenerMovimientosCancelacion(
    token: string,
    pedidoId: string
  ): Promise<any> {
    // Esta función podrías implementarla si el backend 
    // proporciona detalles de los movimientos revertidos
    try {
      return this.makeRequest(`/pedidos/${pedidoId}/movimientos`, token);
    } catch (error) {
      console.warn("No se pudieron obtener detalles de movimientos:", error);
      return null;
    }
  }
}

export const invoicesService = new InvoicesService();