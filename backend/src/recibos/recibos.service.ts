import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CrearReciboDto } from './dto/create-recibo.dto';
import { UpdateReciboDto } from './dto/update-recibo.dto';
import { UsuarioPayload } from 'src/types/usuario-payload';

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
  //crea un recibo y registra en detalle recibo
  async crearRecibo(data: CrearReciboDto, usuario: UsuarioPayload) {
    const { clienteId, tipo, concepto, pedidos } = data;
    console.log('este es el codigo en back del usuario:', usuario.id);
    const recibo = await this.prisma.recibo.create({
      data: {
        clienteId,
        usuarioId: usuario.id, // desde el token
        empresaId: usuario.empresaId, // desde el token
        tipo,
        concepto,
      },
    });

    // crear cada detalle del recibo
    for (const pedido of pedidos) {
      const pedidoOriginal = await this.prisma.pedido.findUnique({
        where: { id: pedido.pedidoId },
        include: { detalleRecibo: true },
      });
      if (!pedidoOriginal) {
        throw new Error(`Pedido con ID ${pedido.pedidoId} no encontrado`);
      }

      const totalAbonadoAnterior = pedidoOriginal.detalleRecibo.reduce(
        (sum, r) => sum + r.valorTotal,
        0,
      );

      const nuevoSaldo =
        pedidoOriginal.total - totalAbonadoAnterior - pedido.valorAplicado;

      await this.prisma.detalleRecibo.create({
        data: {
          idRecibo: recibo.id,
          idPedido: pedido.pedidoId,
          valorTotal: pedido.valorAplicado,
          estado: nuevoSaldo <= 0 ? 'completo' : 'parcial',
          saldoPendiente: Math.max(nuevoSaldo, 0),
        },
      });
    }

    return {
      message: 'Recibo creado con éxito',
      recibo: recibo,
    };
  }

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
