import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CrearReciboDto } from './dto/create-recibo.dto';
import { UpdateReciboDto } from './dto/update-recibo.dto';
import { UsuarioPayload } from 'src/types/usuario-payload';
//import { ResendService } from 'src/resend/resend.service';
//import { PdfUploaderService } from 'src/pdf-uploader/pdf-uploader.service';

@Injectable()
export class RecibosService {
  constructor(
    private prisma: PrismaService,
    // private pdfUploaderService: PdfUploaderService,
    //private resendService: ResendService,
  ) {}

  //helper para validar que el saldo a abonar o actualizar en un recibo no supere el saldo actual
  private async validarSaldoPedido(pedidoId: string, valorAplicado: number) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { detalleRecibo: true },
    });

    if (!pedido) {
      throw new Error(`Pedido con ID ${pedidoId} no encontrado`);
    }

    const totalAbonado = pedido.detalleRecibo.reduce(
      (sum, r) => sum + r.valorTotal,
      0,
    );

    const saldo = pedido.total - totalAbonado;

    if (saldo <= 0) {
      throw new Error(`El pedido ${pedidoId} ya fue abonado completamente.`);
    }

    if (valorAplicado > saldo) {
      throw new Error(
        `El valor aplicado (${valorAplicado}) supera el saldo restante (${saldo}) del pedido ${pedidoId}.`,
      );
    }

    return { saldoRestante: saldo };
  }

  //crea un recibo y registra en detalle recibo y los movimientos te cartera correspondiente
  async crearRecibo(data: CrearReciboDto, usuario: UsuarioPayload) {
    if (!usuario) {
      throw new UnauthorizedException('Usuario no autorizado');
    }

    const { clienteId, tipo, concepto, pedidos } = data;

    // Crea el recibo principal
    const recibo = await this.prisma.recibo.create({
      data: {
        clienteId,
        usuarioId: usuario.id,
        empresaId: usuario.empresaId,
        tipo,
        concepto,
      },
    });

    // Procesa cada pedido relacionado al recibo
    for (const pedido of pedidos) {
      const pedidoOriginal = await this.prisma.pedido.findUnique({
        where: { id: pedido.pedidoId },
        include: { detalleRecibo: true },
      });

      if (!pedidoOriginal) {
        throw new NotFoundException(
          `Pedido con ID ${pedido.pedidoId} no encontrado`,
        );
      }

      // Calcula cuánto ha sido abonado antes
      const totalAbonadoAnterior = pedidoOriginal.detalleRecibo.reduce(
        (sum, r) => sum + r.valorTotal,
        0,
      );

      const saldoRestante = pedidoOriginal.total - totalAbonadoAnterior;
      const nuevoSaldo = saldoRestante - pedido.valorAplicado;

      if (pedido.valorAplicado > saldoRestante) {
        throw new BadRequestException(
          `El valor aplicado (${pedido.valorAplicado}) supera el saldo pendiente (${saldoRestante}) para el pedido ${pedido.pedidoId}`,
        );
      }

      // Crear detalle del recibo
      await this.prisma.detalleRecibo.create({
        data: {
          idRecibo: recibo.id,
          idPedido: pedido.pedidoId,
          valorTotal: pedido.valorAplicado,
          estado: nuevoSaldo <= 0 ? 'completo' : 'parcial',
          saldoPendiente: Math.max(nuevoSaldo, 0),
        },
      });

      // Crear movimiento de cartera asociado a ese pedido
      await this.prisma.movimientosCartera.create({
        data: {
          idCliente: clienteId,
          valorMovimiento: pedido.valorAplicado,
          idUsuario: usuario.id,
          empresaId: usuario.empresaId,
          idPedido: pedido.pedidoId,
          idRecibo: recibo.id,
          observacion: `Abono generado desde creación de recibo # ${recibo.id}`,
        },
      });
    }

    return {
      mensaje: 'Recibo creado con éxito',
      reciboId: recibo.id,
    };
  }

  //obtiene todos los recibos de la bdd ademas de sus detalles abonos y saldo
  async getRecibos(usuario: UsuarioPayload) {
    if (!usuario) throw new UnauthorizedException();

    const { id, empresaId } = usuario;
    const rol = usuario.rol;

    return this.prisma.recibo.findMany({
      where: {
        ...(rol === 'admin' //verifica si es rol admin obtiene todos los recibos de la empresa
          ? {
              empresaId: empresaId,
            }
          : {
              empresaId: empresaId,
              usuario: { id: id },
            }),
      },
      include: {
        cliente: {
          select: {
            nombre: true,
            apellidos: true,
            nit: true,
            email: true,
          },
        },
        detalleRecibo: {
          select: {
            valorTotal: true,
            saldoPendiente: true,
            estado: true,
          },
        },
      },
      orderBy: {
        Fechacrecion: 'desc',
      },
    });
  }
  //logica para actualizar un recibo y sus relaciones
  async actualizarRecibo(
    id: string,
    data: UpdateReciboDto,
    usuario: UsuarioPayload,
  ) {
    if (!usuario) {
      throw new UnauthorizedException('Usuario no autorizado');
    }

    const recibo = await this.prisma.recibo.findUnique({
      where: { id },
      include: {
        detalleRecibo: true,
      },
    });

    if (!recibo) {
      throw new NotFoundException('Recibo no encontrado');
    }

    if (usuario.rol !== 'admin') {
      throw new UnauthorizedException(
        'No tienes permiso para editar este recibo',
      );
    }

    // Validar saldos antes de modificar
    if (data.pedidos) {
      for (const pedido of data.pedidos) {
        await this.validarSaldoPedido(pedido.pedidoId, pedido.valorAplicado);
      }
    }

    const reciboActualizado = await this.prisma.recibo.update({
      where: { id },
      data: {
        tipo: data.tipo,
        concepto: data.concepto,
        cliente: {
          connect: { id: data.clienteId },
        },
      },
    });

    await this.prisma.detalleRecibo.deleteMany({
      where: { idRecibo: id },
    });

    if (data.pedidos) {
      for (const pedido of data.pedidos) {
        const { saldoRestante } = await this.validarSaldoPedido(
          pedido.pedidoId,
          pedido.valorAplicado,
        );

        const nuevoSaldo = saldoRestante - pedido.valorAplicado;

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
    }

    return {
      mensaje: 'Recibo actualizado con éxito',
      recibo: reciboActualizado,
    };
  }
  //logica para obtener acceso a un recibo por su id
  async getReciboPorId(id: string, usuario: UsuarioPayload) {
    if (!usuario) throw new UnauthorizedException('Usuario no autorizado');

    const recibo = await this.prisma.recibo.findUnique({
      where: { id },
      include: {
        cliente: true,
        detalleRecibo: true,
        usuario: true,
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
}
