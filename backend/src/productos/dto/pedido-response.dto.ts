export class PedidoResponseDto {
  id: string;
  clienteId: string;
  vendedorId: string;
  total: number;
  fecha: string;
  observaciones?: string;
  enviado: boolean;
  fechaEnvio?: string;
  actualizado: string;
  productos: {
    productoId: string;
    cantidad: number;
    precio: number;
  }[];
  estados: {
    id: string;
    estado: string;
    fecha: string;
  }[];
}
