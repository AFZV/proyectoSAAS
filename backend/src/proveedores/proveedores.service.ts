import { Injectable } from '@nestjs/common';

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
      if (usuario) {
        const empresaId = usuario.empresaId;
        const proveedor = await this.prisma.proveedores.create({
          data: {
            ...data,
            idEmpresa: empresaId,
          },
        });
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
  async actualizarProveedorId(proveedorId: string, data: UpdateProveedorDto) {
    if (!proveedorId) {
      throw new Error('El id del proveedor es requerido');
    }

    const proveedor = await this.prisma.proveedores.update({
      where: {
        idProveedor: proveedorId,
      },
      data,
    });
    return proveedor;
  }
}
