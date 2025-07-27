import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsuarioRequest } from 'src/types/request-with-usuario';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<UsuarioRequest>();
    const usuario = request.usuario;

    if (!usuario || !roles.includes(usuario.rol)) {
      const method = request.method;
      const path = request.originalUrl;
      throw new ForbiddenException(
        `🚫 Acceso denegado a ${method} ${path} para rol: ${usuario?.rol}`
      );
    }

    return true;
  }
}
