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

  // Crea un proveedor y lo asocia a la empresa del usuario logueado
  async crearProveedor(data: createProveedorDto, usuario: UsuarioPayload) {
    if (usuario.rol === 'admin') {
      const empresaId = usuario.empresaId;

      const proveedor = await this.prisma.proveedores.create({
        data: {
          ...data,
        },
      });

      await this.prisma.proveedorEmpresa.create({
        data: {
          proveedorId: proveedor.idProveedor,
          empresaId,
        },
      });

      return proveedor; // 🔁 Como antes: solo retorna el proveedor
    }
  }

  // Obtiene todos los proveedores de una empresa
  async obtenerProveedores(empresaId: string) {
    if (!empresaId) {
      throw new Error('EmpresaId es requerido');
    }

    const proveedores = await this.prisma.proveedores.findMany({
      where: {
        proveedorEmpresa: {
          some: { empresaId }, // ✅ tienen relación con esta empresa
          none: { empresaId: { not: empresaId } }, // ❌ no están relacionados con otras
        },
      },
    });

    return proveedores;
  }

  // Actualiza un proveedor si pertenece a la empresa del usuario
  async actualizarProveedorId(
    proveedorId: string,
    data: UpdateProveedorDto,
    usuario: UsuarioPayload
  ) {
    if (!proveedorId) {
      throw new Error('El id del proveedor es requerido');
    }

    const relacion = await this.prisma.proveedorEmpresa.findFirst({
      where: {
        proveedorId,
        empresaId: usuario.empresaId,
      },
    });

    if (!relacion) {
      throw new BadRequestException(
        'No tiene permiso para actualizar este proveedor'
      );
    }

    return this.prisma.proveedores.update({
      where: { idProveedor: proveedorId },
      data,
    });
  }

  // Retorna resumen del total de proveedores de una empresa
  async getResumen(usuario: UsuarioPayload) {
    if (!usuario) throw new BadRequestException('No tiene acceso');
    const { empresaId, rol } = usuario;

    if (rol === 'admin') {
      const total = await this.prisma.proveedorEmpresa.count({
        where: { empresaId },
      });

      return {
        total,
      };
    }
  }

  // Retorna un proveedor por su identificación, validando que pertenezca a la empresa del usuario
  async getProveedorById(usuario: UsuarioPayload, proveedorId: string) {
    if (!usuario)
      throw new UnauthorizedException('No está autorizado para acceder');

    const { empresaId } = usuario;

    const relacion = await this.prisma.proveedorEmpresa.findFirst({
      where: {
        empresaId,
        proveedor: {
          identificacion: proveedorId,
        },
      },
      include: {
        proveedor: true,
      },
    });

    if (!relacion || !relacion.proveedor) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    return relacion.proveedor;
  }
}
