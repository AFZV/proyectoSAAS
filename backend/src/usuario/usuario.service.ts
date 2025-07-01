import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { CreateSuperadminDto } from './dto/create-superadmin.dto';
import { UpdateUsuarioAdminDto } from './dto/update-usuarioadmin.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UsuarioPayload } from 'src/types/usuario-payload';

@Injectable()
export class UsuarioService {
  constructor(private prisma: PrismaService) {}

  async createSuperAdmin(data: CreateSuperadminDto, empresaId: string) {
    console.log('empresa id u¿que llega a crera superadmin:', empresaId);
    return this.prisma.usuario.create({
      data: {
        ...data,
        rol: 'superadmin',
        empresaId: empresaId,
        estado: 'activo',
      },
    });
  }

  async actualizarAdmin(id: string, data: UpdateUsuarioAdminDto) {
    return this.prisma.usuario.update({
      where: { id },
      data,
    });
  }

  async obtenerSuperAdmins() {
    const usuarios = await this.prisma.usuario.findMany({
      where: {
        rol: 'superadmin',
        estado: 'activo',
      },
    });
    return usuarios;
  }

  async cambiarEstadoSuperAdmin(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const nuevoEstado = usuario.estado === 'activo' ? 'inactivo' : 'activo';

    return this.prisma.usuario.update({
      where: { id },
      data: { estado: nuevoEstado },
    });
  }
  ///aca empiezan servicios para crear usaurios de empresas nuevas
  async crearUsuario(data: CreateUsuarioDto) {
    // Buscar datos de la empresa (nombre y NIT)
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: data.empresaId },
      select: {
        nombreComercial: true,
        nit: true,
      },
    });

    if (!empresa) {
      throw new Error('Empresa no encontrada');
    }

    // Ahora sí, crear el usuario en la base de datos
    const nuevoUsuario = await this.prisma.usuario.create({
      data: {
        ...data,
        estado: 'activo',
      },
    });

    return nuevoUsuario;
  }

  async actualizarUsuarioEmpresa(data: UpdateUsuarioDto, id: string) {
    const actualizado = await this.prisma.usuario.update({
      where: {
        id: id,
      },
      data: {
        ...data,
      },
    });
    return actualizado;
  }

  async obtenerTodosUsuarios(usuario: UsuarioPayload) {
    if (!usuario) throw new BadRequestException('el usuario no tiene acceso');
    const { rol } = usuario;
    if (rol === 'superadmin') {
      const usuarios = this.prisma.usuario.findMany({
        include: {
          empresa: true,
        },
        orderBy: [
          {
            empresa: {
              nombreComercial: 'asc',
            },
          },
          {
            nombre: 'asc',
          },
        ],
      });
      return usuarios;
    } else {
      throw new BadRequestException('el usuario no tiene acceso');
    }
  }

  async obtenerUsuarioPorId(userId: string) {
    return this.prisma.usuario.findUnique({
      where: { id: userId },
    });
  }

  async getByEmail(email: string) {
    if (!email) throw new BadRequestException('el email es requeridos');
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        correo: email,
      },
      include: {
        empresa: {
          select: {
            nombreComercial: true,
          },
        },
      },
    });
    if (usuario) return usuario;
    return {
      messagge: 'no existe usuario con ese correo',
    };
  }

  //obtiene los usuarios por empresa

  async getUsuariosPorEmpresa(empresaId: string) {
    return this.prisma.usuario.findMany({
      where: { empresaId },
    });
  }

  async getResumen(usuario: UsuarioPayload) {
    if (!usuario) throw new BadRequestException('el usuario es requerido');
    const { rol } = usuario;
    if (rol === 'superadmin') {
      const activos = await this.prisma.usuario.count({
        where: {
          estado: 'activo',
        },
      });
      const total = await this.prisma.usuario.count();
      const inactivos = total - activos;

      return {
        activos,
        inactivos,
        total,
      };
    }
    return {
      messagge: 'no tiene acceso a estos datos',
    };
  }
}
