import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /** 🔍 Rango del día actual */
  private getDiaRango() {
    const hoy = new Date();
    const inicio = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate(),
      0,
      0,
      0,
      0
    );
    const fin = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate(),
      23,
      59,
      59,
      999
    );
    return { inicio, fin };
  }

  /** ✅ Resumen general del Dashboard */
  async getResumen(usuario: UsuarioPayload) {
    if (!usuario) throw new BadRequestException('Usuario no encontrado');

    const { rol, empresaId, id: dbUserId, nombre } = usuario;
    const { inicio: inicioDia, fin: finDia } = this.getDiaRango();

    const whereBase =
      rol === 'admin' ? { empresaId } : { empresaId, usuarioId: dbUserId };

    const [empresa, totalClientes, totalVentasHoy, totalCobrosHoy] =
      await Promise.all([
        this.prisma.empresa.findUnique({ where: { id: empresaId } }),
        this.prisma.clienteEmpresa.count({ where: whereBase }),
        this.prisma.pedido.aggregate({
          _sum: { total: true },
          where: {
            ...whereBase,
            fechaPedido: { gte: inicioDia, lte: finDia },
            estados: { some: { estado: 'FACTURADO' } },
          },
        }),
        this.prisma.detalleRecibo.aggregate({
          _sum: { valorTotal: true },
          where: {
            recibo: {
              ...whereBase,
              Fechacrecion: { gte: inicioDia, lte: finDia },
            },
          },
        }),
      ]);

    return {
      empresa: {
        nit: empresa?.nit,
        nombreComercial: empresa?.nombreComercial,
        telefono: empresa?.telefono,
      },
      usuario: { rol, nombre },
      totalClientes,
      totalVentas: totalVentasHoy._sum.total || 0,
      totalValorRecibos: totalCobrosHoy._sum.valorTotal || 0,
    };
  }

  /**
   * ✅ Cobros por mes (coincide con getDataGraphicsCobros del controller)
   */
  async getDataGraphicsCobros(usuario: UsuarioPayload) {
    if (!usuario) throw new BadRequestException('Usuario no encontrado');

    const { empresaId, rol, id: usuarioId } = usuario;

    const cobros = await this.prisma.$queryRawUnsafe<
      { mes: string; total: number }[]
    >(
      `
      SELECT TO_CHAR(r."Fechacrecion", 'TMMonth') AS mes,
             COALESCE(SUM(dr."valorTotal"), 0) AS total
      FROM "Recibo" r
      JOIN "DetalleRecibo" dr ON dr."idRecibo" = r.id
      WHERE r."empresaId" = $1 ${rol !== 'admin' ? 'AND r."usuarioId" = $2' : ''}
      GROUP BY TO_CHAR(r."Fechacrecion", 'TMMonth')
      ORDER BY MIN(r."Fechacrecion")
    `,
      ...(rol === 'admin' ? [empresaId] : [empresaId, usuarioId])
    );

    return cobros.map((c) => ({
      Mes: c.mes.trim(),
      cobros: Number(c.total),
    }));
  }

  /**
   * ✅ Ventas por mes (coincide con getDataGraphiscVentas del controller)
   */
  async getDataGraphiscVentas(usuario: UsuarioPayload) {
    if (!usuario) throw new BadRequestException('Usuario no encontrado');

    const { empresaId, rol, id: usuarioId } = usuario;

    const ventas = await this.prisma.$queryRawUnsafe<
      { mes: string; total: number }[]
    >(
      `
      SELECT TO_CHAR(p."fechaPedido", 'TMMonth') AS mes,
             COALESCE(SUM(p."total"), 0) AS total
      FROM "Pedido" p
      WHERE p."empresaId" = $1
        ${rol !== 'admin' ? 'AND p."usuarioId" = $2' : ''}
        AND EXISTS (
          SELECT 1 FROM "EstadoPedido" e
          WHERE e."pedidoId" = p.id AND e.estado = 'FACTURADO'
        )
      GROUP BY TO_CHAR(p."fechaPedido", 'TMMonth')
      ORDER BY MIN(p."fechaPedido")
    `,
      ...(rol === 'admin' ? [empresaId] : [empresaId, usuarioId])
    );

    return ventas.map((v) => ({
      Mes: v.mes.trim(),
      ventas: Number(v.total),
    }));
  }
}
