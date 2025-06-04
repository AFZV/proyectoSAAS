import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}
  async getDataGraphicsCobros(usuario: UsuarioPayload) {
    if (!usuario) throw new Error('Usuario no encontrado');

    const { codigo: usuarioId, empresaId, rol } = usuario;

    const recaudos = await this.prisma.recibo.findMany({
      where:
        rol === 'admin'
          ? { usuario: { empresaId } }
          : { usuario: { empresaId }, usuarioId },
      include: {
        detalleRecibo: {
          select: {
            valorTotal: true,
          },
        },
      },
    });

    const meses = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];

    const cobrosPorMes = Array.from({ length: 12 }, (_, i) => ({
      Mes: meses[i],
      cobros: 0,
    }));

    // ✅ Agrupación correcta por mes
    recaudos.forEach((recaudo) => {
      const mesIndex = new Date(recaudo.Fechacrecion).getMonth();
      const totalRecibo = recaudo.detalleRecibo.reduce(
        (sum, detalle) => sum + detalle.valorTotal,
        0,
      );
      cobrosPorMes[mesIndex].cobros += totalRecibo;
    });

    return cobrosPorMes;
  }

  async getDataGraphiscVentas(usuario: UsuarioPayload) {
    if (!usuario) throw new Error('Usuario no encontrado');
    const { codigo: usuarioId, empresaId, rol } = usuario;

    const ventas = await this.prisma.pedido.groupBy({
      by: ['fechaPedido'],
      _sum: { total: true },
      where:
        rol === 'admin'
          ? { usuario: { empresaId: empresaId } }
          : { usuario: { empresaId: empresaId }, usuarioId: usuarioId },
    });

    const meses = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];

    const ventasPorMes = Array.from({ length: 12 }, (_, i) => ({
      Mes: meses[i],
      ventas: 0,
    }));

    ventas.forEach((venta) => {
      const mesIndex = new Date(venta.fechaPedido).getMonth();
      ventasPorMes[mesIndex].ventas += Number(venta._sum.total || 0);
    });

    return ventasPorMes;
  }

  ///obtiene el resumen de total clientes, cobros diarios, y ventas diarias de usuario o emepresa segun rol
  async getResumen(usuario: UsuarioPayload) {
    const hoy = new Date();
    const inicioDia = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate(),
    );
    const finDia = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate(),
      23,
      59,
      59,
    );

    if (!usuario) throw new Error('Usuario no encontrado');

    const { rol, empresaId, codigo: dbUserId, nombre } = usuario;

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });

    const totalClientes = await this.prisma.clienteEmpresa.count({
      where: {
        empresaId,
        ...(rol !== 'admin' && { usuarioId: dbUserId }),
      },
    });

    const recibos = await this.prisma.recibo.findMany({
      where:
        rol === 'admin'
          ? {
              usuario: { empresaId: empresaId },
              Fechacrecion: { gte: inicioDia, lte: finDia },
            }
          : {
              usuarioId: dbUserId,
              Fechacrecion: { gte: inicioDia, lte: finDia },
              usuario: { empresaId: empresaId },
            },
      include: {
        detalleRecibo: true,
      },
    });

    const totalValorRecibos = recibos.reduce((total, recibo) => {
      const sumaDetalles = recibo.detalleRecibo.reduce(
        (suma, detalle) => suma + detalle.valorTotal,
        0,
      );
      return total + sumaDetalles;
    }, 0);

    const totalVentas = await this.prisma.pedido
      .aggregate({
        _sum: { total: true },
        where:
          rol === 'admin'
            ? {
                usuario: { empresaId: empresaId },
                fechaPedido: { gte: inicioDia, lte: finDia },
              }
            : {
                usuarioId: dbUserId,
                fechaPedido: { gte: inicioDia, lte: finDia },
              },
      })
      .then((res) => res._sum.total ?? 0);

    return {
      empresa: {
        nit: empresa?.nit,
        nombreComercial: empresa?.nombreComercial,
        telefono: empresa?.telefono,
      },
      usuario: {
        rol,
        nombre,
      },
      totalClientes,
      totalValorRecibos,
      totalVentas,
    };
  }
}
