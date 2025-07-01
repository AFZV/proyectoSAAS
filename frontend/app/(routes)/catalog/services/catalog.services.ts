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
    // Obtener productos activos y categorías en paralelo
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

    // Crear mapa de categorías para mapeo rápido
    const categoriasMap = new Map(
      categoriasRes.categorias.map((cat) => [cat.idCategoria, cat.nombre])
    );

    // Mapear productos del backend al formato del frontend
    return productosRes.productos.map((producto) => ({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precioVenta, // precioVenta → precio
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

  // 👤 CLIENTE POR NIT
  async buscarClientePorNit(nit: string): Promise<Cliente> {
    // Esto podría ir a un endpoint del backend o mantener la API route actual
    const response = await fetch(`/api/clientePorNit?nit=${nit}`);

    if (!response.ok) {
      throw new Error("Cliente no encontrado");
    }

    return response.json();
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
