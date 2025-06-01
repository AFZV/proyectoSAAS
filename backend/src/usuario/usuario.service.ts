import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { CreateSuperadminDto } from './dto/create-superadmin.dto';
import { UpdateUsuarioAdminDto } from './dto/update-usuarioadmin.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

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
    return this.prisma.usuario.create({
      data: { ...data, estado: 'activo' },
    });
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

  async obtenerTodosUsuarios() {
    return this.prisma.usuario.findMany({});
  }

  async obtenerUsuarioPorId(userId: string) {
    return this.prisma.usuario.findUnique({
      where: { codigo: userId },
    });
  }

  //obtiene los usuarios por empresa

  async getUsuariosPorEmpresa(empresaId: string) {
    return this.prisma.usuario.findMany({
      where: { empresaId },
    });
  }
}
