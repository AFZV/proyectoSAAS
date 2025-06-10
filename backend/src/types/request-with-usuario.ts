import { Request } from 'express';

export interface UsuarioRequest extends Request {
  usuario: {
    id: string;
    codigo: string;
    empresaId: string;
    rol: string;
    nombre: string;
  };
}
