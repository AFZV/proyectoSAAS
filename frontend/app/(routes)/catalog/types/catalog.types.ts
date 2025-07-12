// types/catalog.types.ts
export interface Categoria {
  idCategoria: string;
  nombre: string;
}

// Producto como viene del backend - ACTUALIZADO
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

// Cliente actualizado según tu backend
export interface Cliente {
  id: string;
  nit: string;              // Obligatorio según tu DTO
  rasonZocial?: string;     // Opcional
  nombre: string;           // Obligatorio
  apellidos: string;        // Obligatorio  
  telefono: string;         // Obligatorio
  email: string;            // Tu backend usa 'email', no 'correo'
  direccion: string;        // Obligatorio
  departamento: string;     // Obligatorio
  ciudad: string;           // Obligatorio
  estado?: boolean;         // Estado del cliente
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

// NUEVOS DTOs para gestión de productos
export interface CreateProductoDto {
  nombre: string;
  precioCompra: number;
  precioVenta: number;
  imagenUrl: string;
  categoriaId: string;
}

export interface UpdateProductoDto {
  nombre: string;
  precioCompra: number;
  precioVenta: number;
  categoriaId: string;
}

export interface CreateCategoriaProductoDto {
  nombre: string;
}