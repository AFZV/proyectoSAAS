import { Request } from 'express';

export interface UsuarioRequest extends Request {
  usuario: {
    codigo: string;
    empresaId: string;
    rol: string;
    nombre: string;
  };
}
