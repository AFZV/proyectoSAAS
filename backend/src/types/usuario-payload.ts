export interface UsuarioPayload {
  id: string;
  codigo: string;
  clienteId?: string; // Opcional - solo para rol CLIENTE
  empresaId: string;
  rol: string;
  nombre: string;
}
