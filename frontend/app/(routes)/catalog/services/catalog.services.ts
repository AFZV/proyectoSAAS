import type {
  ProductoBackend,
  Producto,
  Categoria,
  Cliente,
  CreatePedidoDto,
} from "../types/catalog.types";

export class CatalogService {
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
      const error = await response.json();
      throw new Error(error.message || "Error en la petición");
    }

    return response.json();
  }

  // 🛒 PRODUCTOS PARA CATÁLOGO
  async getProductosParaCatalogo(token: string): Promise<Producto[]> {
    const [productosRes, categoriasRes] = await Promise.all([
      this.makeRequest<{ productos: ProductoBackend[] }>(
        "/productos/empresa/activos",
        token
      ),
      this.makeRequest<{ categorias: Categoria[] }>(
        "/productos/categoria/empresa",
        token
      ),
    ]);

    const categoriasMap = new Map(
      categoriasRes.categorias.map((cat) => [cat.idCategoria, cat.nombre])
    );

    return productosRes.productos.map((producto) => ({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precioVenta,
      categoria: categoriasMap.get(producto.categoriaId) || "Sin categoría",
      imagenUrl: producto.imagenUrl,
      stock: producto.inventario?.[0]?.stockActual || 0,
    }));
  }

  // 📂 CATEGORÍAS
  async getCategorias(token: string): Promise<Categoria[]> {
    const response = await this.makeRequest<{ categorias: Categoria[] }>(
      "/productos/categoria/empresa",
      token
    );
    return response.categorias;
  }

  // 👤 CLIENTE POR NIT - CORREGIDO CON EL ENDPOINT CORRECTO
  async buscarClientePorNit(token: string, nit: string): Promise<Cliente> {
    try {
      console.log("🔍 === INICIANDO BÚSQUEDA DE CLIENTE ===");
      console.log("📍 BaseURL:", this.baseUrl);
      console.log("🆔 NIT recibido:", nit);

      // Limpiar NIT
      const nitLimpio = nit.trim().replace(/[.-\s]/g, "");
      console.log("🧹 NIT limpio:", nitLimpio);

      if (!nitLimpio) {
        throw new Error("NIT vacío después de limpiar");
      }

      // 🎯 USAR EL ENDPOINT CORRECTO: /clientes/getByNit/:nit
      const url = `${this.baseUrl}/clientes/getByNit/${nitLimpio}`;
      console.log("🌐 URL completa:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      console.log("📡 Response status:", response.status);
      console.log("📡 Response statusText:", response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error response body:", errorText);

        if (response.status === 404) {
          throw new Error("Cliente no encontrado en la base de datos");
        } else if (response.status === 401) {
          throw new Error("Token de autorización inválido o expirado");
        } else {
          throw new Error(
            `Error ${response.status}: ${errorText || response.statusText}`
          );
        }
      }

      const responseData = await response.json();
      console.log("✅ Response data completa:", responseData);

      // El endpoint getByNit retorna un objeto con estructura { cliente: {...} }
      // Según tu servicio: return clienteEmpresa; (que incluye el cliente)
      let cliente;

      if (responseData.cliente) {
        // Si viene en formato { cliente: {...} }
        cliente = responseData.cliente;
      } else if (responseData.id) {
        // Si viene directamente el cliente
        cliente = responseData;
      } else {
        throw new Error("Formato de respuesta inesperado del servidor");
      }

      console.log("👤 Cliente final:", cliente);
      console.log("🎉 === BÚSQUEDA EXITOSA ===");

      return cliente;
    } catch (error) {
      console.error("💥 === ERROR EN BÚSQUEDA ===");
      console.error("❌ Error completo:", error);
      throw error;
    }
  }

  // 🔄 MÉTODO ALTERNATIVO: Usar getByFilter en lugar de getByNit
  async buscarClientePorNitAlternativo(
    token: string,
    nit: string
  ): Promise<Cliente> {
    try {
      console.log("🔍 === BÚSQUEDA ALTERNATIVA CON FILTRO ===");

      const nitLimpio = nit.trim().replace(/[.-\s]/g, "");

      if (!nitLimpio) {
        throw new Error("NIT vacío");
      }

      // 🎯 USAR ENDPOINT ALTERNATIVO: /clientes/getByFilter/:filtro
      const url = `${this.baseUrl}/clientes/getByFilter/${nitLimpio}`;
      console.log("🌐 URL alternativa:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error response:", errorText);

        if (response.status === 404) {
          throw new Error("Cliente no encontrado");
        } else {
          throw new Error(
            `Error ${response.status}: ${errorText || response.statusText}`
          );
        }
      }

      const clientes = await response.json();
      console.log("✅ Clientes encontrados:", clientes);

      // getByFilter retorna un array de clientes
      const cliente = Array.isArray(clientes) ? clientes[0] : clientes;

      if (!cliente) {
        throw new Error("No se encontró cliente en la respuesta");
      }

      return cliente;
    } catch (error) {
      console.error("❌ Error en búsqueda alternativa:", error);
      throw error;
    }
  }

  // 🛒 CREAR PEDIDO DESDE CARRITO
  async crearPedidoDesdeCarrito(
    token: string,
    clienteId: string,
    carrito: { id: string; cantidad: number; precio: number }[],
    observaciones?: string
  ): Promise<any> {
    const pedidoData: CreatePedidoDto = {
      clienteId,
      observaciones,
      productos: carrito.map((item) => ({
        productoId: item.id,
        cantidad: item.cantidad,
        precio: item.precio,
      })),
    };

    return this.makeRequest("/pedidos", token, {
      method: "POST",
      body: JSON.stringify(pedidoData),
    });
  }
}

// Instancia singleton
export const catalogService = new CatalogService();
