// services/catalog.services.ts
import type {
  ProductoBackend,
  Producto,
  Categoria,
  Cliente,
  CreatePedidoDto,
  CreateProductoDto,
  UpdateProductoDto,
  CreateCategoriaProductoDto,
} from "../types/catalog.types";

export class CatalogService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL;

  private async makeRequest<T>(
    endpoint: string,
    token: string,
    options?: RequestInit,
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
        token,
      ),
      this.makeRequest<{ categorias: Categoria[] }>(
        "/productos/categoria/empresa",
        token,
      ),
    ]);

    const categoriasMap = new Map(
      categoriasRes.categorias.map((cat) => [cat.idCategoria, cat.nombre]),
    );

    // Mapear productos y ordenar alfabéticamente por nombre
    const productosOrdenados = productosRes.productos
      .map((producto) => ({
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precioVenta,
        categoria: categoriasMap.get(producto.categoriaId) || "Sin categoría",
        imagenUrl: producto.imagenUrl,
        stock: producto.inventario?.[0]?.stockActual ?? 0,
        imagenes: producto.imagenes || [], // ← agregar esto
      }))
      .sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es", {
          sensitivity: "base",
          numeric: true,
        }),
      );

    return productosOrdenados;
  }

  // 🛠️ GESTIÓN DE PRODUCTOS - NUEVO

  // Obtener todos los productos de la empresa (para administración)
  async getAllProductosEmpresa(token: string): Promise<ProductoBackend[]> {
    const response = await this.makeRequest<{ productos: ProductoBackend[] }>(
      "/productos/empresa",
      token,
    );
    return response.productos;
  }

  // Crear nuevo producto
  async createProducto(
    token: string,
    productoData: CreateProductoDto,
  ): Promise<any> {
    return this.makeRequest("/productos/create", token, {
      method: "POST",
      body: JSON.stringify(productoData),
    });
  }

  // Actualizar producto
  async updateProducto(
    token: string,
    productoId: string,
    productoData: UpdateProductoDto,
  ): Promise<any> {
    return this.makeRequest(`/productos/update/${productoId}`, token, {
      method: "PUT",
      body: JSON.stringify(productoData),
    });
  }

  // Cambiar estado del producto (activo/inactivo)
  async toggleProductoEstado(token: string, productoId: string): Promise<any> {
    return this.makeRequest(`/productos/update/${productoId}`, token, {
      method: "PATCH",
    });
  }

  // Crear nueva categoría
  async createCategoria(
    token: string,
    categoriaData: CreateCategoriaProductoDto,
  ): Promise<any> {
    return this.makeRequest("/productos/categoria/create", token, {
      method: "POST",
      body: JSON.stringify(categoriaData),
    });
  }

  // Obtener productos por categoría
  async getProductosPorCategoria(
    token: string,
    categoriaId: string,
  ): Promise<ProductoBackend[]> {
    return this.makeRequest(`/productos/categoria/${categoriaId}`, token);
  }

  // 📂 CATEGORÍAS
  async getCategorias(token: string): Promise<Categoria[]> {
    const response = await this.makeRequest<{ categorias: Categoria[] }>(
      "/productos/categoria/empresa",
      token,
    );
    return response.categorias;
  }

  // 👤 CLIENTE POR NIT - CORREGIDO CON EL ENDPOINT CORRECTO
  async buscarClientePorNit(token: string, nit: string): Promise<Cliente> {
    try {
      // Limpiar NIT
      const nitLimpio = nit.trim().replace(/[.-\s]/g, "");

      if (!nitLimpio) {
        throw new Error("NIT vacío después de limpiar");
      }

      // 🎯 USAR EL ENDPOINT CORRECTO: /clientes/getByNit/:nit
      const url = `${this.baseUrl}/clientes/getByNit/${nitLimpio}`;

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
        console.error("❌ Error response body:", errorText);

        if (response.status === 404) {
          throw new Error("Cliente no encontrado en la base de datos");
        } else if (response.status === 401) {
          throw new Error("Token de autorización inválido o expirado");
        } else {
          throw new Error(
            `Error ${response.status}: ${errorText || response.statusText}`,
          );
        }
      }

      const responseData = await response.json();

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

      return cliente;
    } catch (error) {
      throw error;
    }
  }

  // 🔄 MÉTODO ALTERNATIVO: Usar getByFilter en lugar de getByNit
  async buscarClientePorNitAlternativo(
    token: string,
    nit: string,
  ): Promise<Cliente> {
    try {
      const nitLimpio = nit.trim().replace(/[.-\s]/g, "");

      if (!nitLimpio) {
        throw new Error("NIT vacío");
      }

      // 🎯 USAR ENDPOINT ALTERNATIVO: /clientes/getByFilter/:filtro
      const url = `${this.baseUrl}/clientes/getByFilter/${nitLimpio}`;

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
            `Error ${response.status}: ${errorText || response.statusText}`,
          );
        }
      }

      const clientes = await response.json();

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
    observaciones?: string,
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

  // 📄 GENERAR CATÁLOGO PDF POR IDS SELECCIONADOS
  async generarCatalogoPorIds(
    token: string,
    productoIds: string[],
  ): Promise<{ url: string; key: string; count: number }> {
    return this.makeRequest(
      "/productos/catalogoseleccionado/seleccionado",
      token,
      {
        method: "POST",
        body: JSON.stringify({ productoIds }),
      },
    );
  }
}

// Instancia singleton
export const catalogService = new CatalogService();
