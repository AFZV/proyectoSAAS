import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calcula inicio y fin del día en zona horaria Bogotá (UTC-5)
   */
  private getDiaBogotaRango() {
    const ahora = new Date();
    const bogotaOffset = -5 * 60; // Bogotá UTC-5 en minutos
    const localOffset = ahora.getTimezoneOffset(); // Offset del servidor
    const diff = (bogotaOffset - localOffset) * 60 * 1000;

    // Inicio del día Bogotá
    const inicio = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate()
    );
    inicio.setTime(inicio.getTime() + diff);

    // Fin del día Bogotá
    const fin = new Date(inicio);
    fin.setHours(23, 59, 59, 999);

    return { inicio, fin };
  }

  /**
   * Calcula rangos comparativos mensuales en zona Bogotá
   */
  private obtenerRangosComparativos(hoy: Date) {
    const bogotaOffset = -5 * 60;
    const localOffset = hoy.getTimezoneOffset();
    const diff = (bogotaOffset - localOffset) * 60 * 1000;

    // Rango actual
    const inicioMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    inicioMesActual.setTime(inicioMesActual.getTime() + diff);

    const finMesActual = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate()
    );
    finMesActual.setTime(finMesActual.getTime() + diff);

    // Rango anterior
    const inicioMesAnterior = new Date(
      hoy.getFullYear(),
      hoy.getMonth() - 1,
      1
    );
    inicioMesAnterior.setTime(inicioMesAnterior.getTime() + diff);

    let finMesAnterior = new Date(
      hoy.getFullYear(),
      hoy.getMonth() - 1,
      hoy.getDate()
    );
    finMesAnterior.setTime(finMesAnterior.getTime() + diff);

    // Ajustar si el mes anterior no tiene ese día
    if (finMesAnterior.getMonth() !== inicioMesAnterior.getMonth()) {
      finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
      finMesAnterior.setTime(finMesAnterior.getTime() + diff);
    }

    return {
      rangoActual: { desde: inicioMesActual, hasta: finMesActual },
      rangoAnterior: { desde: inicioMesAnterior, hasta: finMesAnterior },
    };
  }

  /**
   * Gráfico de cobros por mes
   */
  async getDataGraphicsCobros(usuario: UsuarioPayload) {
    if (!usuario) throw new Error('Usuario no encontrado');

    const { id: usuarioId, empresaId, rol } = usuario;

    const recaudos = await this.prisma.recibo.findMany({
      where:
        rol === 'admin'
          ? { usuario: { empresaId } }
          : { usuario: { empresaId }, usuarioId },
      include: {
        detalleRecibo: {
          select: { valorTotal: true },
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

    const cobrosPorMes = meses.map((m) => ({ Mes: m, cobros: 0 }));

    recaudos.forEach((rec) => {
      const mesIndex = new Date(rec.Fechacrecion).getMonth();
      const totalRecibo = rec.detalleRecibo.reduce(
        (sum, d) => sum + d.valorTotal,
        0
      );
      cobrosPorMes[mesIndex].cobros += totalRecibo;
    });

    return cobrosPorMes;
  }

  /**
   * Gráfico de ventas por mes
   */
  async getDataGraphiscVentas(usuario: UsuarioPayload) {
    if (!usuario) throw new Error('Usuario no encontrado');

    const { id: usuarioId, empresaId, rol } = usuario;

    const ventas = await this.prisma.pedido.groupBy({
      by: ['fechaPedido'],
      _sum: { total: true },
      where:
        rol === 'admin'
          ? { empresaId, estados: { some: { estado: 'FACTURADO' } } }
          : {
              empresaId,
              usuarioId,
              estados: { some: { estado: 'FACTURADO' } },
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

    const ventasPorMes = meses.map((m) => ({ Mes: m, ventas: 0 }));

    ventas.forEach((venta) => {
      const mesIndex = new Date(venta.fechaPedido).getMonth();
      ventasPorMes[mesIndex].ventas += Number(venta._sum.total || 0);
    });

    return ventasPorMes;
  }

  /**
   * Resumen dashboard (clientes, cobros diarios, ventas diarias, variaciones)
   */
  async getResumen(usuario: UsuarioPayload) {
    if (!usuario) throw new Error('Usuario no encontrado');

    const { rol, empresaId, id: dbUserId, nombre } = usuario;
    const hoy = new Date();

    const { inicio: inicioDia, fin: finDia } = this.getDiaBogotaRango();
    const rangos = this.obtenerRangosComparativos(hoy);
    const { rangoActual, rangoAnterior } = rangos;

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

    // Ventas del día
    const totalVentas = await this.prisma.pedido
      .aggregate({
        _sum: { total: true },
        where: {
          empresaId,
          fechaPedido: { gte: inicioDia, lte: finDia },
          ...(rol !== 'admin' && { usuarioId: dbUserId }),
          estados: { some: { estado: 'FACTURADO' } },
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
          fechaPedido: { gte: rangoActual.desde, lte: rangoActual.hasta },
          estados: { some: { estado: 'FACTURADO' } },
        },
      }),
      this.prisma.pedido.aggregate({
        _sum: { total: true },
        where: {
          ...(rol === 'admin'
            ? { usuario: { empresaId } }
            : { usuarioId: dbUserId }),
          fechaPedido: { gte: rangoAnterior.desde, lte: rangoAnterior.hasta },
          estados: { some: { estado: 'FACTURADO' } },
        },
      }),
    ]);

    const totalActual = ventasActual._sum.total || 0;
    const totalAnterior = ventasAnterior._sum.total || 0;
    const variacionPorcentualVentas =
      totalAnterior === 0
        ? totalActual > 0
          ? 100
          : 0
        : ((totalActual - totalAnterior) / totalAnterior) * 100;

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
      operacionesActual: recibos.length,
      variaciones: { variacionPorcentualVentas, variacionPorcentualCobros },
      ultimosPedidos,
    };
  }
}
