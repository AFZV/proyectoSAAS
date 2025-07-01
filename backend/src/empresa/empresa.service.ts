import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { UsuarioPayload } from 'src/types/usuario-payload';

@Injectable()
export class EmpresaService {
  constructor(private prisma: PrismaService) {}

  // Crear una empresa
  async create(data: CreateEmpresaDto) {
    const empresa = await this.prisma.empresa.create({
      data: { ...data, estado: 'activa' },
    });

    // const folderName = `${empresa.nit}-${empresa.nombreComercial}`;
    //  // const parentFolder = this.googleDriveService.EMPRESAS_FOLDER_ID;
    //   if (!parentFolder) throw new Error('el folder padre es requerido');

    //   const folderId = await this.googleDriveService.createFolder(
    //     folderName,
    //     parentFolder
    //   );

    return {
      empresa,
      //folderId,
    };
  }

  // Obtener todas las empresas
  async findAll() {
    const empresas = this.prisma.empresa.findMany();
    return empresas;
  }

  // Obtener una empresa por su ID
  async findOne(id: string) {
    const empresa = await this.prisma.empresa.findUnique({ where: { id } });
    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }
    return empresa;
  }

  // Actualizar una empresa por su ID
  async update(id: string, data: UpdateEmpresaDto) {
    return this.prisma.empresa.update({
      where: { id },
      data,
    });
  }

  //obtener empresa por nit

  async obtenerPorNit(nit: string) {
    const empresa = this.prisma.empresa.findFirst({
      where: { nit: nit },
    });
    if (empresa === null)
      throw new BadRequestException('No existe la empresa con ese nit');
    return empresa;
  }

  // Cambiar estado (activa ↔ inactiva)
  async CambiarEstado(idEmpresa: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: idEmpresa },
    });

    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    const nuevoEstado = empresa.estado === 'activa' ? 'inactiva' : 'activa';

    return this.prisma.empresa.update({
      where: { id: idEmpresa },
      data: { estado: nuevoEstado },
    });
  }

  async dataHeader(usuario: UsuarioPayload) {
    if (!usuario) throw new BadRequestException('el usuario es requerido');
    const { rol } = usuario;
    if (rol === 'superadmin') {
      const totalEmpresas = await this.prisma.empresa.count();
      const totalActivas = await this.prisma.empresa.count({
        where: { estado: 'activa' },
      });
      const totalInactivas = totalEmpresas - totalActivas;

      return {
        totalEmpresas,
        totalActivas,
        totalInactivas,
      };
    } else {
      throw new Error('no puede acceder a esta informacion');
    }
  }
}
