import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}
  obtenerRangosComparativos(hoy: Date) {
    const diaActual = hoy.getDate(); // por ejemplo 8

    // Rango del mes actual: del 1 al hoy
    const inicioMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), diaActual);

    // Rango del mes anterior: del 1 al "mismo día" del mes anterior
    const inicioMesAnterior = new Date(
      hoy.getFullYear(),
      hoy.getMonth() - 1,
      1,
    );
    let finMesAnterior = new Date(
      hoy.getFullYear(),
      hoy.getMonth() - 1,
      diaActual,
    );

    // ⚠️ Ajustar si el mes anterior no tiene ese día (p.ej., 31 de mayo → 30 abril)
    if (finMesAnterior.getMonth() !== inicioMesAnterior.getMonth()) {
      finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0); // último día del mes anterior
    }

    return {
      rangoActual: {
        desde: inicioMesActual,
        hasta: finMesActual,
      },
      rangoAnterior: {
        desde: inicioMesAnterior,
        hasta: finMesAnterior,
      },
    };
  }

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
    const { id: usuarioId, empresaId, rol } = usuario;

    const ventas = await this.prisma.pedido.groupBy({
      by: ['fechaPedido'],
      _sum: { total: true },
      where:
        rol === 'admin'
          ? { empresaId: empresaId }
          : { empresaId: empresaId, usuarioId: usuarioId },
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
    const rangos = this.obtenerRangosComparativos(hoy);
    const { rangoActual, rangoAnterior } = rangos;

    console.log('rangos de fechas hoy :', { rangoAnterior, rangoActual });
    const finDia = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate(),
      23,
      59,
      59,
    );

    if (!usuario) throw new Error('Usuario no encontrado');

    const { rol, empresaId, id: dbUserId, nombre } = usuario;

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });

    const totalClientes = await this.prisma.clienteEmpresa.count({
      where:
        rol === 'admin'
          ? { empresaId: empresaId }
          : {
              empresaId: empresaId,
              usuarioId: dbUserId,
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

    //se obtiene la variacion de las ventas respecto a la misma cantidad de ventas del ems anterior
    const [ventasActual, ventasAnterior] = await Promise.all([
      this.prisma.pedido.aggregate({
        _sum: { total: true },
        where:
          rol === 'admin'
            ? {
                usuario: { empresaId },
                fechaPedido: {
                  gte: rangoActual.desde,
                  lte: rangoActual.hasta,
                },
              }
            : {
                usuarioId: dbUserId,
                fechaPedido: {
                  gte: rangoActual.desde,
                  lte: rangoActual.hasta,
                },
              },
      }),
      this.prisma.pedido.aggregate({
        _sum: { total: true },
        where:
          rol === 'admin'
            ? {
                usuario: { empresaId },
                fechaPedido: {
                  gte: rangoAnterior.desde,
                  lte: rangoAnterior.hasta,
                },
              }
            : {
                usuarioId: dbUserId,
                fechaPedido: {
                  gte: rangoAnterior.desde,
                  lte: rangoAnterior.hasta,
                },
              },
      }),
    ]);
    const totalActual = ventasActual._sum.total || 0;
    const totalAnterior = ventasAnterior._sum.total || 0;

    const variacionPorcentualVentas =
      totalAnterior === 0
        ? totalActual > 0
          ? 100 // aumento absoluto (sin base anterior)
          : 0 // sin cambios
        : ((totalActual - totalAnterior) / totalAnterior) * 100;

    // console.log(`🟢 Ventas actuales: ${totalActual}`);
    // console.log(`🔵 Ventas anteriores: ${totalAnterior}`);
    // console.log(`📈 Variación: ${variacionPorcentualVentas.toFixed(2)}%`);
    //////////////////////////////////////////////////////////////////////////////

    // retorna la variacion de los cobros respecto al mes anterior
    const [cobrosActual, cobrosAnterior] = await Promise.all([
      this.prisma.detalleRecibo.aggregate({
        _sum: { valorTotal: true },
        where:
          rol === 'admin'
            ? {
                recibo: {
                  empresaId: empresaId,
                  Fechacrecion: {
                    gte: rangoActual.desde,
                    lte: rangoActual.hasta,
                  },
                },
              }
            : {
                recibo: {
                  usuarioId: dbUserId,
                  Fechacrecion: {
                    gte: rangoActual.desde,
                    lte: rangoActual.hasta,
                  },
                },
              },
      }),
      this.prisma.detalleRecibo.aggregate({
        _sum: { valorTotal: true },
        where:
          rol === 'admin'
            ? {
                recibo: {
                  empresaId: empresaId,
                  Fechacrecion: {
                    gte: rangoAnterior.desde,
                    lte: rangoAnterior.hasta,
                  },
                },
              }
            : {
                recibo: {
                  usuarioId: dbUserId,
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
        : Math.round(((totalActualCobros - totalAnteriorCobros) / totalAnteriorCobros) * 100 * 100) / 100;

    // console.log(`🟢 cobros actuales: ${totalActualCobros}`);
    // console.log(`🔵 cobros anteriores: ${totalAnteriorCobros}`);
    // console.log(`📈 Variación: ${variacionPorcentualCobros.toFixed(2)}%`);
    ///////////////////////////////////////////////////////////////
    const ultimosPedidos = await this.prisma.pedido.findMany({
      where:
        rol === 'admin' ? { empresaId } : { empresaId, usuarioId: dbUserId },
      orderBy: { fechaPedido: 'desc' },
      take: 5,
      include: {
        cliente: {
          select: {
            nombre: true,
            apellidos: true,
            rasonZocial: true,
          },
        },
        estados: {
          orderBy: { fechaEstado: 'desc' },
          take: 1,
          select: {
            estado: true,
            fechaEstado: true,
          },
        },
      },
    });
    const [operacionesActual, operacionesAnterior] = await Promise.all([
      this.prisma.recibo.aggregate({
        _count: true,
        where:
          rol === 'admin'
            ? {
                empresaId: empresaId,
                Fechacrecion: {
                  gte: rangoActual.desde,
                  lte: rangoActual.hasta,
                },
              }
            : {
                empresaId: empresaId,
                usuarioId: usuario.id,
                Fechacrecion: {
                  gte: rangoActual.desde,
                  lte: rangoActual.hasta,
                },
              },
      }),
      this.prisma.recibo.aggregate({
        _count: true,
        where:
          rol === 'admin'
            ? {
                empresaId: empresaId,
                Fechacrecion: {
                  gte: rangoAnterior.desde,
                  lte: rangoAnterior.hasta,
                },
              }
            : {
                empresaId: empresaId,
                usuarioId: usuario.id,
                Fechacrecion: {
                  gte: rangoAnterior.desde,
                  lte: rangoAnterior.hasta,
                },
              },
      }),
    ]);
    const opeACtual = operacionesActual._count;
    const apeAnterior = operacionesAnterior._count;
    const variacionOp =
      apeAnterior === 0
        ? opeACtual === 0
          ? 0 // sin cambio
          : 100 // todo es crecimiento
        : ((opeACtual - apeAnterior) / apeAnterior) * 100;

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

      variaciones: {
        variacionPorcentualVentas,
        variacionPorcentualCobros,
        variacionOp,
      },
      ultimosPedidos,
    };
  }
}
