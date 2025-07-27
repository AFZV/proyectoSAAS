import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { verificarTokenClerk } from 'src/auth/clerk.utils';

@Injectable()
export class UsuarioGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers.authorization;

    const payload = await verificarTokenClerk(authHeader); // ✅ Reutilizas tu propia función

    const userId = payload.sub;

    const usuario = await this.prisma.usuario.findFirst({
      where: {
        codigo: userId,
        estado: 'activo', // ✅ solo usuarios activos
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado en base de datos');
    }

    req['usuario'] = usuario;

    return true;
  }
}
