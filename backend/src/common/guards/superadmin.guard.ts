// src/common/guards/superadmin.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { verificarTokenClerk } from 'src/auth/clerk.utils';

@Injectable()
export class SuperadminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers.authorization;

    const payload = await verificarTokenClerk(authHeader);
    const userId = payload.sub;

    const usuario = await this.prisma.usuario.findUnique({
      where: { codigo: userId },
      select: {
        id: true,
        rol: true,
        empresaId: true,
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (usuario.rol !== 'superadmin') {
      throw new ForbiddenException('Acceso restringido a superadmin');
    }

    req['usuario'] = usuario;
    return true;
  }
}
