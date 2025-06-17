import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { CreateSuperadminDto } from './dto/create-superadmin.dto';
import { UpdateUsuarioAdminDto } from './dto/update-usuarioadmin.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { GoogleDriveService } from 'src/google-drive/google-drive.service';

@Injectable()
export class UsuarioService {
  constructor(
    private prisma: PrismaService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

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

    // Construir nombre de carpeta empresa
    const empresaFolderName = `${empresa.nit}-${empresa.nombreComercial}`;

    // Validar carpeta raíz de empresas
    const rootEmpresasFolderId = this.googleDriveService.EMPRESAS_FOLDER_ID;
    if (!rootEmpresasFolderId) {
      throw new Error('GOOGLE_DRIVE_EMPRESAS_FOLDER_ID no está definida.');
    }

    // Buscar ID de carpeta de la empresa
    const empresaFolderId = await this.googleDriveService.findFolderIdByName(
      empresaFolderName,
      rootEmpresasFolderId,
    );

    if (!empresaFolderId) {
      throw new Error(
        `No se encontró la carpeta de la empresa: ${empresaFolderName}`,
      );
    }

    // Intentar crear carpeta del usuario y subcarpetas
    let usuarioFolderId: string;
    try {
      usuarioFolderId = await this.googleDriveService.createFolder(
        data.nombre,
        empresaFolderId,
      );

      await this.googleDriveService.createFolder('recibos', usuarioFolderId);
      await this.googleDriveService.createFolder('pedidos', usuarioFolderId);
    } catch (error) {
      throw new Error(`Error al crear carpetas en Google Drive: ${error}`);
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

  async obtenerTodosUsuarios() {
    return this.prisma.usuario.findMany({});
  }

  async obtenerUsuarioPorId(userId: string) {
    return this.prisma.usuario.findUnique({
      where: { id: userId },
    });
  }

  //obtiene los usuarios por empresa

  async getUsuariosPorEmpresa(empresaId: string) {
    return this.prisma.usuario.findMany({
      where: { empresaId },
    });
  }
}
