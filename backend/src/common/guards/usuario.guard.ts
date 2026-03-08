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
export class UsuarioGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers.authorization;

    const payload = await verificarTokenClerk(authHeader);

    const userId = payload.sub;

    const usuario = await this.prisma.usuario.findFirst({
      where: {
        codigo: userId,
        estado: 'activo',
      },
      select: {
        id: true,
        codigo: true,
        clienteId: true,
        nombre: true,
        apellidos: true,
        telefono: true,
        correo: true,
        rol: true,
        estado: true,
        empresaId: true,
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    /**
     * 🔒 BLOQUEO POR INSTANCIA
     * (excepto superadmin)
     */
    const instanceEmpresaId = process.env.INSTANCE_EMPRESA_ID;

    if (
      usuario.rol !== 'superadmin' &&
      instanceEmpresaId &&
      usuario.empresaId !== instanceEmpresaId
    ) {
      throw new ForbiddenException(
        'Este usuario no pertenece a esta instancia'
      );
    }

    req['usuario'] = usuario;

    return true;
  }
}
