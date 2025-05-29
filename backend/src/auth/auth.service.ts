import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async getUserByCodigo(userId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { codigo: userId },
      select: {
        id: true,
        empresaId: true,
        rol: true,
        nombre: true,
        apellidos: true,
        empresa: {
          select: {
            nombreComercial: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado en base de datos');
    }

    return {
      usuarioId: usuario.id,
      empresaId: usuario.empresaId,
      rol: usuario.rol,
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      logoUrl: usuario.empresa.logoUrl,
      nombreEmpresa: usuario.empresa.nombreComercial,
    };
  }
}
