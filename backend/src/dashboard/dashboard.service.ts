import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';
import {
  getDiaRangoBogota,
  getAnioRangoBogota,
  getMonthBogota,
  obtenerRangosComparativosBogota,
} from 'src/common/utils/timezone.util';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) { }

  private readonly MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];

  /**
   * Gráfico de cobros por mes filtrado por año (en hora Bogotá).
   * Usa Fechacrecion del Recibo.
   */
  async getDataGraphicsCobros(usuario: UsuarioPayload, year: number) {
    if (!usuario) throw new Error('Usuario no encontrado');
    const { id: usuarioId, empresaId, rol } = usuario;

    const { inicio, fin } = getAnioRangoBogota(year);

    const recaudos = await this.prisma.recibo.findMany({
      where:
        rol === 'admin'
          ? { usuario: { empresaId }, Fechacrecion: { gte: inicio, lte: fin } }
          : { usuario: { empresaId }, usuarioId, Fechacrecion: { gte: inicio, lte: fin } },
      include: { detalleRecibo: { select: { valorTotal: true } } },
    });

    const cobrosPorMes = this.MESES.map((m) => ({ Mes: m, cobros: 0 }));
    recaudos.forEach((rec) => {
      // Usar getMonthBogota para evitar desfase de timezone del servidor
      const idx = getMonthBogota(new Date(rec.Fechacrecion));
      cobrosPorMes[idx].cobros += rec.detalleRecibo.reduce(
        (s, d) => s + d.valorTotal, 0
      );
    });
    return cobrosPorMes;
  }

  /**
   * Gráfico de ventas por mes filtrado por año (en hora Bogotá).
   *
   * REGLA DE NEGOCIO: Una venta cuenta en la fecha en que el pedido
   * fue FACTURADO (fechaEstado del EstadoPedido), NO en la fecha de creación.
   * Esto garantiza que el gráfico muestre los mismos datos que los reportes.
   */
  async getDataGraphiscVentas(usuario: UsuarioPayload, year: number) {
    if (!usuario) throw new Error('Usuario no encontrado');
    const { id: usuarioId, empresaId, rol } = usuario;

    const { inicio, fin } = getAnioRangoBogota(year);

    // Traer los estados FACTURADO del año, con el total del pedido
    const estadosFacturados = await this.prisma.estadoPedido.findMany({
      where: {
        estado: 'FACTURADO',
        fechaEstado: { gte: inicio, lte: fin },
        pedido: {
          empresaId,
          ...(rol !== 'admin' && { usuarioId }),
        },
      },
      select: {
        fechaEstado: true,
        pedido: { select: { total: true } },
      },
    });

    const ventasPorMes = this.MESES.map((m) => ({ Mes: m, ventas: 0 }));
    estadosFacturados.forEach((e) => {
      // Convertir a mes en timezone Bogotá (evita desfase del servidor)
      const idx = getMonthBogota(new Date(e.fechaEstado));
      ventasPorMes[idx].ventas += Number(e.pedido.total || 0);
    });
    return ventasPorMes;
  }

  /**
   * Resumen del Dashboard
   */
  async getResumen(usuario: UsuarioPayload) {
    if (!usuario) throw new Error('Usuario no encontrado');

    const { rol, empresaId, id: dbUserId, nombre } = usuario;

    // Rangos en hora Bogotá
    const { inicio: inicioDia, fin: finDia } = getDiaRangoBogota();
    const { rangoActual, rangoAnterior } = obtenerRangosComparativosBogota();

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

    // Pedidos FACTURADOS del día (filtra por fechaEstado del estado FACTURADO)
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

    // Ventas del día (suma de totales de pedidos FACTURADOS hoy)
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

    // Variación mensual ventas
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

    // Cobros mensuales
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
