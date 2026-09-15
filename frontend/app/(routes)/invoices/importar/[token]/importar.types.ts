// Item tal como lo devuelve GET /pedidos/importar/:token — precio/stock ya son datos
// ACTUALES (no lo que había cuando se compartió el catálogo), resueltos en el momento.
export interface ItemPedidoImportado {
  productoId: string;
  nombre: string | null;
  disponible: boolean;
  cantidad: number;
  precio: number | null;
  stock: number | null;
  imagenUrl: string | null;
  categoria?: string;
  observacion?: string;
}

export interface ClienteBusqueda {
  id: string;
  nit: string;
  nombre: string;
  apellidos?: string;
  rasonZocial?: string;
}
