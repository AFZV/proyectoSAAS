import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * Ajusta la fecha actual a la zona horaria de Bogotá (UTC-5)
   */
  private getLocalDateBogota(): Date {
    const now = new Date();
    // Ajustar a UTC-5 (Bogotá)
    const offset = -5 * 60; // minutos
    const localTime = now.getTime() + offset * 60 * 1000;
    return new Date(localTime);
  }

  /**
   * Devuelve inicio y fin del día actual en hora local (Bogotá)
   */
  private getDiaRango() {
    const now = this.getLocalDateBogota();
    const inicio = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0
    );
    const fin = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );
    return { inicio, fin };
  }

  /**
   * Rangos mensuales para comparativas (en hora local Bogotá)
   */
  private obtenerRangosComparativos() {
    const now = this.getLocalDateBogota();

    // Mes actual
    const inicioMesActual = new Date(now.getFullYear(), now.getMonth(), 1);
    const finMesActual = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );

    // Mes anterior
    const inicioMesAnterior = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );
    let finMesAnterior = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate(),
      23,
      59,
      59,
      999
    );

    // Ajuste si el mes anterior no tiene ese día
    if (finMesAnterior.getMonth() !== inicioMesAnterior.getMonth()) {
      finMesAnterior = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999
      );
    }

    return {
      rangoActual: { desde: inicioMesActual, hasta: finMesActual },
      rangoAnterior: { desde: inicioMesAnterior, hasta: finMesAnterior },
    };
  }

  private readonly MESES = [
    'enero','febrero','marzo','abril','mayo','junio',
    'julio','agosto','septiembre','octubre','noviembre','diciembre',
  ];

  /**
   * Gráfico de cobros por mes filtrado por año
   */
  async getDataGraphicsCobros(usuario: UsuarioPayload, year: number) {
    if (!usuario) throw new Error('Usuario no encontrado');
    const { id: usuarioId, empresaId, rol } = usuario;

    const inicio = new Date(year, 0, 1);
    const fin = new Date(year, 11, 31, 23, 59, 59, 999);

    const recaudos = await this.prisma.recibo.findMany({
      where:
        rol === 'admin'
          ? { usuario: { empresaId }, Fechacrecion: { gte: inicio, lte: fin } }
          : { usuario: { empresaId }, usuarioId, Fechacrecion: { gte: inicio, lte: fin } },
      include: { detalleRecibo: { select: { valorTotal: true } } },
    });

    const cobrosPorMes = this.MESES.map((m) => ({ Mes: m, cobros: 0 }));
    recaudos.forEach((rec) => {
      const idx = new Date(rec.Fechacrecion).getMonth();
      cobrosPorMes[idx].cobros += rec.detalleRecibo.reduce(
        (s, d) => s + d.valorTotal, 0
      );
    });
    return cobrosPorMes;
  }

  /**
   * Gráfico de ventas por mes filtrado por año
   */
  async getDataGraphiscVentas(usuario: UsuarioPayload, year: number) {
    if (!usuario) throw new Error('Usuario no encontrado');
    const { id: usuarioId, empresaId, rol } = usuario;

    const inicio = new Date(year, 0, 1);
    const fin = new Date(year, 11, 31, 23, 59, 59, 999);

    const ventas = await this.prisma.pedido.groupBy({
      by: ['fechaPedido'],
      _sum: { total: true },
      where:
        rol === 'admin'
          ? { empresaId, fechaPedido: { gte: inicio, lte: fin }, estados: { some: { estado: 'FACTURADO' } } }
          : { empresaId, usuarioId, fechaPedido: { gte: inicio, lte: fin }, estados: { some: { estado: 'FACTURADO' } } },
    });

    const ventasPorMes = this.MESES.map((m) => ({ Mes: m, ventas: 0 }));
    ventas.forEach((v) => {
      const idx = new Date(v.fechaPedido).getMonth();
      ventasPorMes[idx].ventas += Number(v._sum.total || 0);
    });
    return ventasPorMes;
  }

  /**
   * Resumen del Dashboard
   */
  async getResumen(usuario: UsuarioPayload) {
    if (!usuario) throw new Error('Usuario no encontrado');

    const { rol, empresaId, id: dbUserId, nombre } = usuario;

    const { inicio: inicioDia, fin: finDia } = this.getDiaRango();
    const { rangoActual, rangoAnterior } = this.obtenerRangosComparativos();

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });

    const totalClientes = await this.prisma.clienteEmpresa.count({
      where:
        rol === 'admin' ? { empresaId } : { empresaId, usuarioId: dbUserId },
    });

    // Recibos del día
    const recibos = await this.prisma.recibo.findMany({
      where:
        rol === 'admin'
          ? { empresaId, Fechacrecion: { gte: inicioDia, lte: finDia } }
          : {
              empresaId,
              usuarioId: dbUserId,
              Fechacrecion: { gte: inicioDia, lte: finDia },
            },
      include: { detalleRecibo: true },
    });

    const totalValorRecibos = recibos.reduce(
      (total, r) =>
        total + r.detalleRecibo.reduce((s, d) => s + d.valorTotal, 0),
      0
    );

    //pedidos del dia
    const pedidos = await this.prisma.pedido.findMany({
      where: {
        empresaId,
        ...(rol !== 'admin' && { usuarioId: dbUserId }),
        estados: {
          some: {
            estado: 'FACTURADO',
            fechaEstado: { gte: inicioDia, lte: finDia },
          },
        },
      },
    });

    // Ventas del día
    const totalVentas = await this.prisma.pedido
      .aggregate({
        _sum: { total: true },
        where: {
          empresaId,
          ...(rol !== 'admin' && { usuarioId: dbUserId }),
          estados: {
            some: {
              estado: 'FACTURADO',
              fechaEstado: { gte: inicioDia, lte: finDia },
            },
          },
        },
      })
      .then((res) => res._sum.total ?? 0);

    // Variación mensual ventas y cobros
    const [ventasActual, ventasAnterior] = await Promise.all([
      this.prisma.pedido.aggregate({
        _sum: { total: true },
        where: {
          ...(rol === 'admin'
            ? { usuario: { empresaId } }
            : { usuarioId: dbUserId }),
          estados: {
            some: {
              estado: 'FACTURADO',
              fechaEstado: { gte: rangoActual.desde, lte: rangoActual.hasta },
            },
          },
        },
      }),
      this.prisma.pedido.aggregate({
        _sum: { total: true },
        where: {
          ...(rol === 'admin'
            ? { usuario: { empresaId } }
            : { usuarioId: dbUserId }),
          estados: {
            some: {
              estado: 'FACTURADO',
              fechaEstado: {
                gte: rangoAnterior.desde,
                lte: rangoAnterior.hasta,
              },
            },
          },
        },
      }),
    ]);

    const totalOperacionesDia: number = recibos.length + pedidos.length;
    const totalActual = ventasActual._sum.total || 0;
    const totalAnterior = ventasAnterior._sum.total || 0;
    const variacionPorcentualVentas =
      totalAnterior === 0
        ? totalActual > 0
          ? 100
          : 0
        : ((totalActual - totalAnterior) / totalAnterior) * 100;

    // Cobros
    const [cobrosActual, cobrosAnterior] = await Promise.all([
      this.prisma.detalleRecibo.aggregate({
        _sum: { valorTotal: true },
        where: {
          recibo: {
            ...(rol === 'admin' ? { empresaId } : { usuarioId: dbUserId }),
            Fechacrecion: { gte: rangoActual.desde, lte: rangoActual.hasta },
          },
        },
      }),
      this.prisma.detalleRecibo.aggregate({
        _sum: { valorTotal: true },
        where: {
          recibo: {
            ...(rol === 'admin' ? { empresaId } : { usuarioId: dbUserId }),
            Fechacrecion: {
              gte: rangoAnterior.desde,
              lte: rangoAnterior.hasta,
            },
          },
        },
      }),
    ]);

    const totalActualCobros = cobrosActual._sum.valorTotal || 0;
    const totalAnteriorCobros = cobrosAnterior._sum.valorTotal || 0;
    const variacionPorcentualCobros =
      totalAnteriorCobros === 0
        ? totalActualCobros > 0
          ? 100
          : 0
        : ((totalActualCobros - totalAnteriorCobros) / totalAnteriorCobros) *
          100;

    const ultimosPedidos = await this.prisma.pedido.findMany({
      where:
        rol === 'admin' ? { empresaId } : { empresaId, usuarioId: dbUserId },
      orderBy: { fechaPedido: 'desc' },
      take: 5,
      include: {
        cliente: {
          select: { nombre: true, apellidos: true, rasonZocial: true },
        },
        estados: {
          orderBy: { fechaEstado: 'desc' },
          take: 1,
          select: { estado: true, fechaEstado: true },
        },
      },
    });

    return {
      empresa: {
        nit: empresa?.nit,
        nombreComercial: empresa?.nombreComercial,
        telefono: empresa?.telefono,
      },
      usuario: { rol, nombre },
      totalClientes,
      totalValorRecibos,
      totalVentas,
      operacionesActual: totalOperacionesDia,
      variaciones: { variacionPorcentualVentas, variacionPorcentualCobros },
      ultimosPedidos,
    };
  }
}
