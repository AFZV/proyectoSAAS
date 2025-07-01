import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { createProveedorDto } from './dto/create-proveedor.dto';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';

@Injectable()
export class ProveedoresService {
  constructor(private prisma: PrismaService) {}

  //crea un proveedor en la bdd tomando el empresaid del usuario logueado
  async crearProveedor(data: createProveedorDto, usuario: UsuarioPayload) {
    try {
      if (usuario.rol === 'admin') {
        const empresaId = usuario.empresaId;
        const proveedor = await this.prisma.proveedores.create({
          data: {
            ...data,
            idEmpresa: empresaId,
          },
        });
        // const relacion = await this.prisma.proveedorEmpresa.create({
        //   data: {
        //     proveedorId: proveedor.idProveedor,

        //   },
        // });
        return proveedor;
      }
    } catch (error) {
      if (error) {
        throw error;
      }
    }
  }

  ///obtiene todos los proveedores de una empresa
  async obtenerProveedores(empresaId: string) {
    if (!empresaId) {
      throw new Error('EmpresaId es requerido');
    }

    return this.prisma.proveedores.findMany({
      where: {
        idEmpresa: empresaId,
      },
    });
  }

  ///actualizar empresa pasando el id y los datos a actualizar
  async actualizarProveedorId(
    proveedorId: string,
    data: UpdateProveedorDto,
    usuario: UsuarioPayload
  ) {
    if (!proveedorId) {
      throw new Error('El id del proveedor es requerido');
    }

    // Verificar que el proveedor pertenece a la empresa del usuario
    const proveedor = await this.prisma.proveedores.findUnique({
      where: { idProveedor: proveedorId },
    });

    if (!proveedor || proveedor.idEmpresa !== usuario.empresaId) {
      throw new BadRequestException(
        'No tiene permiso para actualizar este proveedor'
      );
    }

    return this.prisma.proveedores.update({
      where: { idProveedor: proveedorId },
      data,
    });
  }

  async getResumen(usuario: UsuarioPayload) {
    if (!usuario) throw new BadRequestException('No tiene acceso');
    const { empresaId, rol } = usuario;
    if (rol === 'admin') {
      const total = await this.prisma.proveedores.count({
        where: {
          idEmpresa: empresaId,
        },
      });
      return {
        total,
      };
    }
  }

  async getProveedorById(usuario: UsuarioPayload, proveedorId: string) {
    if (!usuario)
      throw new UnauthorizedException('No esta autorizado para acceder');
    const { empresaId } = usuario;
    const proveedor = await this.prisma.proveedores.findFirst({
      where: {
        identificacion: proveedorId,
        idEmpresa: empresaId,
      },
    });
    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado');
    }
    console.log('respondio el service:', proveedor);
    return proveedor;
  }
}
