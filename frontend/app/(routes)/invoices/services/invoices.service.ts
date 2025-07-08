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
    console.log('📦 Opciones:', options);

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
      console.error('❌ Error en response:', error);
      throw new Error(error.message || `Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Datos recibidos:', data);
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

  // 🔄 ACTUALIZAR ESTADO DE PEDIDO - CORREGIDO PARA /estado
  async actualizarEstadoPedido(
    token: string,
    pedidoId: string,
    data: {
      estado: string;
      guiaTransporte?: string;
      flete?: number;
    }
  ): Promise<any> {
    console.log('🔄 Actualizando estado del pedido:');
    console.log('📋 Datos enviados:', {
      pedidoId,
      estado: data.estado,
      guiaTransporte: data.guiaTransporte,
      flete: data.flete
    });

    // ✅ PREPARAR PAYLOAD CON CAMPOS OBLIGATORIOS
    const payload = {
  pedidoId,
  estado: data.estado,
  guiaTransporte: data.guiaTransporte,  // ✅ Siempre incluir
  flete: data.flete                     // ✅ Siempre incluir
};

    console.log('📤 Payload final:', payload);

    try {
      const result = await this.makeRequest(
        '/pedidos/estado', // ✅ CORREGIDO: Usar /estado en lugar de /estados
        token,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      console.log('✅ Estado actualizado exitosamente:', result);
      return result;
    } catch (error) {
      console.error('❌ Error al actualizar estado:', error);
      throw error;
    }
  }

  // ✏️ ACTUALIZAR PEDIDO COMPLETO
  async actualizarPedido(
    token: string,
    pedidoId: string,
    data: Partial<CreatePedidoDto>
  ): Promise<Pedido> {
    console.log('📝 Actualizando pedido completo:', { pedidoId, data });
    
    return this.makeRequest<Pedido>(`/pedidos/${pedidoId}`, token, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
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
    console.log('🔍 Filtrando pedidos:', filtros);

    // ✅ USAR QUERY PARAMETERS EN LUGAR DE BODY
    const params = new URLSearchParams({
      filtro: filtros.filtro,
      tipoFiltro: filtros.tipoFiltro
    });

    return this.makeRequest<Pedido[]>(`/pedidos/filtro?${params.toString()}`, token, {
      method: 'GET',
    });
  }

  // 📊 OBTENER ESTADÍSTICAS
  async obtenerEstadisticasPedidos(token: string): Promise<EstadisticasPedidos> {
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

    pedidos.forEach((pedido: any) => {
      let estadoActual = 'GENERADO';
      
      if (pedido.estados && Array.isArray(pedido.estados) && pedido.estados.length > 0) {
        const estadosOrdenados = pedido.estados.sort((a: any, b: any) => 
          new Date(b.fechaEstado).getTime() - new Date(a.fechaEstado).getTime()
        );
        estadoActual = estadosOrdenados[0].estado;
      }
      
      stats.pedidosPorEstado[estadoActual] = (stats.pedidosPorEstado[estadoActual] || 0) + 1;
      
      const fechaPedido = new Date(pedido.fechaPedido);
      if (fechaPedido >= hoy && fechaPedido < mañana) {
        stats.pedidosHoy++;
      }
      
      if (['FACTURADO', 'ENVIADO', 'ENTREGADO'].includes(estadoActual)) {
        stats.ventasTotal += pedido.total || 0;

        if (fechaPedido >= hoy && fechaPedido < mañana) {
          stats.ventasHoy += pedido.total || 0;
        }
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
}

export const invoicesService = new InvoicesService();
