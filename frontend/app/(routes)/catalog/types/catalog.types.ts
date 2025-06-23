export interface Categoria {
  idCategoria: string;
  nombre: string;
}

// Producto como viene del backend
export interface ProductoBackend {
  id: string;
  nombre: string;
  precioCompra: number;
  precioVenta: number;
  imagenUrl: string;
  estado: 'activo' | 'inactivo';
  categoriaId: string;
  empresaId: string;
  inventario?: {
    stockActual: number;
    stockReferenciaOinicial: number;
  }[];
}

// Producto adaptado para el frontend/catálogo
export interface Producto {
  id: string;
  nombre: string;
  precio: number;           // Mapeamos precioVenta → precio
  categoria: string;        // Mapeamos categoriaId → nombre categoria
  imagenUrl: string;
  stock: number;
}

// Item del carrito
export interface CarritoItem extends Producto {
  cantidad: number;
}

// Cliente para pedidos
export interface Cliente {
  id: string;
  nit?: string;
  nombres: string;
  apellidos: string;
  rasonZocial?: string;
  telefono: string;
  ciudad: string;
  correo: string;
  direccion?: string;
}

// DTO para crear pedido
export interface CreatePedidoDto {
  clienteId: string;
  observaciones?: string;
  productos: {
    productoId: string;
    cantidad: number;
    precio: number;
  }[];
}