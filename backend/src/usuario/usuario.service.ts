import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
//import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { CreateSuperadminDto } from './dto/create-superadmin.dto';

@Injectable()
export class UsuarioService {
  constructor(private prisma: PrismaService) {}

  create(data: CreateUsuarioDto) {
    return this.prisma.usuario.create({ data });
  }

  // ✅ Este es el método correcto
  async createSuperadmin(data: CreateSuperadminDto) {
    return this.prisma.usuario.create({
      data: {
        ...data,
        rol: 'superadmin',
        empresaId: '', // O null si lo permites en el modelo
      },
    });
  }

  // usuario.service.ts
  async getUsuarioConEmpresa(userId: string) {
    console.log('Buscando usuario con codigo:', userId);
    console.log('userId recibido en backend:', userId);

    const usuario = await this.prisma.usuario.findUnique({
      where: { codigo: userId },
      select: {
        id: true,
        codigo: true,
        rol: true,
        empresaId: true,
        empresa: {
          select: {
            nombreComercial: true,
            nit: true,
          },
        },
      },
    });

    if (!usuario) {
      console.log('⚠️ No se encontró el usuario con código:', userId);
    } else {
      console.log('✅ Usuario encontrado:', usuario);
    }

    return usuario;
  }

  async getRolUsuario(userId: string): Promise<string | null> {
    const user = await this.prisma.usuario.findUnique({
      where: {
        codigo: userId,
      },
      select: {
        rol: true,
      },
    });
    return user?.rol ?? null;
  }

  async getUsuariosPorEmpresa(empresaId: string) {
    return this.prisma.usuario.findMany({
      where: {
        empresaId,
      },
      select: {
        codigo: true,
        nombres: true,
        apellidos: true,
        rol: true,
      },
    });
  }

  async usuarioExistePorCodigo(userId: string) {
    return this.prisma.usuario.findFirst({
      where: { codigo: userId },
      select: {
        codigo: true,
      },
    });
  }
}
