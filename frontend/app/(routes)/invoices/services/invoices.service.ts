// services/invoices.service.ts - SIN ESTADO ENTREGADO

import type {
  Pedido,
  CreatePedidoDto,
  FilterPedidoOptions,
  EstadisticasPedidos,
  PedidosPaginadosResponse,
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
      console.error("❌ Error en response:", error);
      throw new Error(
        error.message || `Error ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();

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
  // invoices.service.ts
  async actualizarEnvioPedido(
    token: string,
    pedidoId: string,
    data: { guiaTransporte?: string | null; flete?: number | null }
  ) {
    const payload = {
      guiaTransporte:
        typeof data.guiaTransporte === "string"
          ? data.guiaTransporte.trim() || null
          : data.guiaTransporte ?? null,
      flete:
        typeof data.flete === "number"
          ? Number.isFinite(data.flete)
            ? data.flete
            : null
          : data.flete ?? null,
    };

    return this.makeRequest<Pedido>(`/pedidos/${pedidoId}/envio`, token, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  // 🔄 ACTUALIZAR ESTADO DE PEDIDO - CON ACEPTADO
  async actualizarEstadoPedido(
    token: string,
    pedidoId: string,
    data: {
      estado: string;
      guiaTransporte?: string;
      flete?: number;
    }
  ): Promise<any> {
    // ✅ VALIDACIÓN: Solo estados permitidos (con ACEPTADO)
    const estadosPermitidos = [
      "GENERADO",
      "ACEPTADO",
      "SEPARADO",
      "FACTURADO",
      "ENVIADO",
      "CANCELADO",
    ];
    if (!estadosPermitidos.includes(data.estado)) {
      throw new Error(
        `Estado no válido: ${
          data.estado
        }. Estados permitidos: ${estadosPermitidos.join(", ")}`
      );
    }

    // ✅ PREPARAR PAYLOAD SEGÚN EL BACKEND
    const payload = {
      pedidoId,
      estado: data.estado,
      guiaTransporte: data.guiaTransporte || "", // ✅ Backend espera string
      flete: data.flete || 0, // ✅ Backend espera number
    };

    try {
      const result = await this.makeRequest(
        "/pedidos/estado", // ✅ Endpoint correcto según tu controller
        token,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

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
    return this.makeRequest<Pedido>(`/pedidos/${pedidoId}`, token, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // 🚫 CANCELAR PEDIDO - SOLO EN SEPARADO Y FACTURADO
  async cancelarPedido(token: string, pedidoId: string): Promise<any> {
    try {
      const result = await this.actualizarEstadoPedido(token, pedidoId, {
        estado: "CANCELADO",
        guiaTransporte: "",
        flete: 0,
      });

      return result;
    } catch (error) {
      console.error("❌ Error al cancelar pedido:", error);
      throw new Error(
        error instanceof Error ? error.message : "No se pudo cancelar el pedido"
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
    // ✅ USAR QUERY PARAMETERS - PERO VERIFICAR SI BACKEND ESPERA BODY
    // Según tu controller, usa @Body(), así que enviamos en el body
    return this.makeRequest<Pedido[]>("/pedidos/filtro", token, {
      method: "GET", // ✅ Cambiar a POST si tu backend espera body
      body: JSON.stringify(filtros),
    });
  }

  // 📊 OBTENER ESTADÍSTICAS - SIN ENTREGADO
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
      pedidosCancelados: 0,
      pedidosEnviados: 0, // ✅ ENVIADO ahora es el estado final exitoso
      ventasPerdidas: 0,
      porcentajeExito: 0, // ✅ % de pedidos que llegan a ENVIADO
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

      // ✅ Estadísticas de ventas - FACTURADO y ENVIADO generan ventas
      if (["FACTURADO", "ENVIADO"].includes(estadoActual)) {
        stats.ventasTotal += pedido.total || 0;

        if (fechaPedido >= hoy && fechaPedido < mañana) {
          stats.ventasHoy += pedido.total || 0;
        }
      }

      // ✅ Estadísticas específicas
      if (estadoActual === "CANCELADO") {
        stats.pedidosCancelados++;
      }

      if (estadoActual === "ENVIADO") {
        stats.pedidosEnviados++;
      }
    });

    // ✅ Calcular porcentaje de éxito (pedidos que llegan a ENVIADO)
    if (stats.totalPedidos > 0) {
      stats.porcentajeExito =
        (stats.pedidosEnviados / stats.totalPedidos) * 100;
    }

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

  // 🔍 VERIFICAR SI PEDIDO PUEDE SER CANCELADO - CON ACEPTADO
  verificarPuedeCancelar(pedido: Pedido): { puede: boolean; razon?: string } {
    if (!pedido.estados || pedido.estados.length === 0) {
      return { puede: true }; // GENERADO puede cancelarse
    }

    const estadoActual = pedido.estados.sort(
      (a, b) =>
        new Date(b.fechaEstado).getTime() - new Date(a.fechaEstado).getTime()
    )[0].estado;

    switch (estadoActual) {
      case "GENERADO":
      case "ACEPTADO":
      case "SEPARADO":
      case "FACTURADO":
        return { puede: true };

      case "ENVIADO": // ✅ ENVIADO ya no puede cancelarse (es estado final)
        return {
          puede: false,
          razon:
            "No se puede cancelar un pedido que ya fue enviado (estado final)",
        };

      case "CANCELADO":
        return {
          puede: false,
          razon: "El pedido ya está cancelado",
        };

      default:
        return {
          puede: false,
          razon: "Estado no reconocido",
        };
    }
  }

  // 🔍 VERIFICAR SI PEDIDO ESTÁ COMPLETADO - SIN ENTREGADO
  verificarEstaCompletado(pedido: Pedido): {
    completado: boolean;
    estado: string;
  } {
    if (!pedido.estados || pedido.estados.length === 0) {
      return { completado: false, estado: "GENERADO" };
    }

    const estadoActual = pedido.estados.sort(
      (a, b) =>
        new Date(b.fechaEstado).getTime() - new Date(a.fechaEstado).getTime()
    )[0].estado;

    return {
      completado: estadoActual === "ENVIADO", // ✅ ENVIADO = completado exitosamente
      estado: estadoActual,
    };
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

  // 📈 OBTENER MÉTRICAS DE RENDIMIENTO - SIN ENTREGADO
  async obtenerMetricasRendimiento(token: string): Promise<any> {
    try {
      const pedidos = await this.obtenerPedidos(token);
      const estadisticas = await this.obtenerEstadisticasPedidos(token);

      // ✅ Calcular tiempo promedio hasta ENVIADO
      const pedidosEnviados = pedidos.filter((p) => {
        const estadoActual = this.getEstadoActual(p);
        return estadoActual === "ENVIADO";
      });

      let tiempoPromedioEnvio = 0;
      if (pedidosEnviados.length > 0) {
        const tiempos = pedidosEnviados.map((p) => {
          const fechaCreacion = new Date(p.fechaPedido);
          const fechaEnvio = new Date(p.fechaEnvio || p.fechaPedido);
          return (
            (fechaEnvio.getTime() - fechaCreacion.getTime()) /
            (1000 * 60 * 60 * 24)
          ); // días
        });

        tiempoPromedioEnvio =
          tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
      }

      return {
        tiempoPromedioEnvio: Math.round(tiempoPromedioEnvio * 10) / 10, // redondear a 1 decimal
        tasaCancelacion:
          estadisticas.totalPedidos > 0
            ? ((estadisticas.pedidosCancelados ?? 0) /
                estadisticas.totalPedidos) *
              100
            : 0,

        //  tasaExito: estadisticas.porcentajeExito || 0, // % que llegan a ENVIADO
        valorPromedioPedido:
          estadisticas.totalPedidos > 0
            ? estadisticas.ventasTotal / estadisticas.totalPedidos
            : 0,
        distribucionEstados: estadisticas.pedidosPorEstado,
      };
    } catch (error) {
      console.error("Error al obtener métricas:", error);
      return null;
    }
  }

  // 🔍 HELPER: Obtener estado actual de un pedido
  private getEstadoActual(pedido: Pedido): string {
    if (!pedido.estados || pedido.estados.length === 0) {
      return "GENERADO";
    }
    const estadosOrdenados = pedido.estados.sort(
      (a, b) =>
        new Date(b.fechaEstado).getTime() - new Date(a.fechaEstado).getTime()
    );
    return estadosOrdenados[0].estado;
  }

  // 📊 VALIDAR TRANSICIÓN DE ESTADO - CON ACEPTADO
  validarTransicionEstado(
    estadoActual: string,
    nuevoEstado: string
  ): { valida: boolean; razon?: string } {
    const transicionesValidas: Record<string, string[]> = {
      GENERADO: ["ACEPTADO"],
      ACEPTADO: ["SEPARADO", "CANCELADO"],
      SEPARADO: ["FACTURADO", "CANCELADO"],
      FACTURADO: ["ENVIADO", "CANCELADO"],
      ENVIADO: [], // ✅ Estado final, no puede cambiar
      CANCELADO: [], // ✅ Estado final, no puede cambiar
    };

    const estadosPermitidos = transicionesValidas[estadoActual] || [];

    if (!estadosPermitidos.includes(nuevoEstado)) {
      return {
        valida: false,
        razon: `No se puede cambiar de ${estadoActual} a ${nuevoEstado}. Estados permitidos: ${
          estadosPermitidos.join(", ") || "ninguno (estado final)"
        }`,
      };
    }

    return { valida: true };
  }

  // 🎯 OBTENER PRÓXIMOS PASOS RECOMENDADOS
  obtenerProximosPasos(pedido: Pedido): string[] {
    const estadoActual = this.getEstadoActual(pedido);

    switch (estadoActual) {
      case "GENERADO":
        return ["Aceptar pedido para continuar procesamiento"];

      case "ACEPTADO":
        return ["Separar productos del inventario", "Cancelar si es necesario"];

      case "SEPARADO":
        return ["Facturar pedido", "Cancelar si es necesario"];

      case "FACTURADO":
        return ["Enviar pedido al cliente", "Cancelar si es necesario"];

      case "ENVIADO":
        return ["Pedido completado exitosamente ✓"];

      case "CANCELADO":
        return ["Pedido cancelado - No requiere acción"];

      default:
        return ["Estado no reconocido"];
    }
  }

  //nuevo metodo obtener pedidos paginados
  async obtenerPedidosPaginados(
    token: string,
    opciones?: {
      pagina?: number;
      limite?: number;
      estado?: string;
      q?: string;
    }
  ): Promise<PedidosPaginadosResponse> {
    const params = new URLSearchParams();

    if (opciones?.pagina) params.set("pagina", String(opciones.pagina));
    if (opciones?.limite) params.set("limite", String(opciones.limite));
    if (opciones?.estado && opciones.estado !== "todos")
      params.set("estado", opciones.estado);
    if (opciones?.q && opciones.q.trim() !== "")
      params.set("q", opciones.q.trim());

    const qs = params.toString();
    const endpoint = qs
      ? `/pedidos/new/paginado?${qs}`
      : "/pedidos/new/paginado";

    return this.makeRequest<PedidosPaginadosResponse>(endpoint, token, {
      method: "GET",
    });
  }
}

export const invoicesService = new InvoicesService();
