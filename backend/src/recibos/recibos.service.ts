import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CrearReciboDto } from './dto/create-recibo.dto';
import { UpdateReciboDto } from './dto/update-recibo.dto';

@Injectable()
export class RecibosService {
  constructor(private prisma: PrismaService) {}
  async getRecaudosPorRango(
    from: Date,
    to: Date,
    nombreVendedor: string,
    userId: string,
  ) {
    const usuarioEmpresa = await this.prisma.usuario.findUnique({
      where: { codigo: userId },
      select: {
        empresaId: true,
      },
    });
    const recibos = await this.prisma.recibo.findMany({
      where: {
        Fechacrecion: {
          gte: from,
          lte: to,
        },
        usuario:
          nombreVendedor !== 'todos'
            ? {
                nombre: nombreVendedor, // Filtra por el nombre del vendedor específico
                empresa: {
                  id: usuarioEmpresa?.empresaId, // Filtra por la empresa relacionada con el vendedor
                },
              }
            : {
                // Si el vendedor es "todos", solo se filtra por empresa
                empresaId: usuarioEmpresa?.empresaId,
              },
      },
      select: {
        id: true,
        tipo: true,
        Fechacrecion: true,
        concepto: true,
        //valor: true,
        cliente: {
          select: {
            nombre: true,
            apellidos: true,
          },
        },
        usuario: {
          select: {
            nombre: true,
          },
        },
      },
    });

    return recibos;
  }
   /*
  async CrearRecibo(data: CrearReciboDto, userId: string) {
    // 1. Obtener el usuario autenticado (vendedor)
    const usuario = await this.prisma.usuario.findUnique({
      where: { codigo: userId },
      select: {
        id: true,
        rol: true,
        empresaId: true,
      },
    });

    if (!usuario) throw new UnauthorizedException('Usuario no autorizado');

    // 2. Buscar cliente relacionado a la empresa y al vendedor (si no es admin)
    const relacion = await this.prisma.clienteEmpresa.findFirst({
      where: {
        empresaId: usuario.empresaId,
        cliente: { nit: data.nit },
        ...(usuario.rol !== 'admin' && { vendedorId: usuario.id }),
      },
      include: {
        cliente: true,
      },
    });

    if (!relacion) {
      throw new NotFoundException('Cliente no encontrado o no asignado');
    }

    // 3. Crear el recibo
    const nuevoRecibo = await this.prisma.recibo.create({
     data: {
        clienteId: relacion.cliente.id,
        usuario: { connect: { id: data.usuarioId } },
        empresa: { connect: { id: usuario.empresaId } },
        //valor: data.valor,
        tipo: data.tipo,
        concepto: data.concepto,
      },
    });

    return nuevoRecibo;
  } 

   */

  async getRecibosPorUsuario(userId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { codigo: userId },
    });

    if (!usuario) throw new UnauthorizedException();

    const { rol, id, empresaId } = usuario;

    return this.prisma.recibo.findMany({
      where: {
        ...(rol === 'admin'
          ? {
              cliente: {
                empresas: {
                  some: { empresaId },
                },
              },
            }
          : {
              cliente: {
                empresas: {
                  some: {
                    empresaId,
                    usuarioId: id,
                  },
                },
              },
              usuarioId: id, // 👈 obligatorio si no es admin
            }),
      },
      include: {
        cliente: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: {
        Fechacrecion: 'desc',
      },
    });
  }

  async eliminarRecibo(id: string) {
    // Verificar si el recibo existe
    const recibo = await this.prisma.recibo.findUnique({
      where: { id },
    });

    if (!recibo) {
      throw new NotFoundException('Recibo no encontrado');
    }

    // Eliminar el recibo
    await this.prisma.recibo.delete({
      where: { id },
    });

    return { mensaje: 'Recibo eliminado correctamente', id };
  }

  async actualizarRecibo(id: string, data: UpdateReciboDto, userId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { codigo: userId },
      select: {
        id: true,
        rol: true,
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no autorizado');
    }

    const recibo = await this.prisma.recibo.findUnique({
      where: { id },
    });

    if (!recibo) {
      throw new NotFoundException('Recibo no encontrado');
    }

    // Solo admin o el mismo vendedor puede actualizarlo
    if (usuario.rol !== 'admin' && recibo.usuarioId !== usuario.id) {
      throw new UnauthorizedException(
        'No tienes permiso para editar este recibo',
      );
    }

    const reciboActualizado = await this.prisma.recibo.update({
      where: { id },
      data,
    });

    return reciboActualizado;
  }

  async getReciboPorId(id: string, userId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { codigo: userId },
      select: {
        id: true,
        rol: true,
        empresaId: true,
      },
    });

    if (!usuario) throw new UnauthorizedException('Usuario no autorizado');

    const recibo = await this.prisma.recibo.findUnique({
      where: { id },
      include: {
        cliente: {
          select: {
            id: true,
            nit: true,
            nombre: true,
            apellidos: true,
            email: true,
            ciudad: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    if (!recibo) {
      throw new NotFoundException('Recibo no encontrado');
    }

    // Verificar permisos (admin o vendedor propietario)
    const esAdmin = usuario.rol === 'admin';
    const esVendedorPropietario = recibo.usuarioId === usuario.id;

    if (!esAdmin && !esVendedorPropietario) {
      throw new UnauthorizedException('No tienes acceso a este recibo');
    }

    return recibo;
  }
}
