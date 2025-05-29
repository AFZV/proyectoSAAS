import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // async getDataGraphicsCobros(userId: string) {
  //   const usuario = await this.prisma.usuario.findUnique({
  //     where: { codigo: userId },
  //     select: {
  //       id: true,
  //       rol: true,
  //       empresaId: true,
  //     },
  //   });

  //   if (!usuario) throw new Error('Usuario no encontrado');

  //   const { rol, empresaId, id } = usuario;

  //   const whereClause =
  //     rol === 'admin'
  //       ? { vendedor: { empresaId } }
  //       : { usuarioId: id, vendedor: { empresaId } };

  //   const recaudos = await this.prisma.recibo.groupBy({
  //     by: ['Fechacrecion'],
  //     _sum: { : true },
  //     where: whereClause,
  //   });

  //   const meses = [
  //     'enero',
  //     'febrero',
  //     'marzo',
  //     'abril',
  //     'mayo',
  //     'junio',
  //     'julio',
  //     'agosto',
  //     'septiembre',
  //     'octubre',
  //     'noviembre',
  //     'diciembre',
  //   ];

  //   const ventasPorMes = Array.from({ length: 12 }, (_, i) => ({
  //     Mes: meses[i],
  //     cobros: 0,
  //   }));

  //   recaudos.forEach((recaudo) => {
  //     const mesIndex = new Date(recaudo.creado).getMonth();
  //     ventasPorMes[mesIndex].cobros += Number(recaudo._sum.valor || 0);
  //   });

  //   return ventasPorMes;
  // }

  // async getDataGraphiscVentas(userId: string) {
  //   const usuario = await this.prisma.usuario.findUnique({
  //     where: { codigo: userId },
  //     select: {
  //       id: true,
  //       rol: true,
  //       empresaId: true,
  //     },
  //   });

  //   if (!usuario) throw new Error('Usuario no encontrado');

  //   const { rol, empresaId, id } = usuario;

  //   const whereClause =
  //     rol === 'admin'
  //       ? { vendedor: { empresaId } }
  //       : { vendedorId: id, vendedor: { empresaId } };

  //   const ventas = await this.prisma.pedido.groupBy({
  //     by: ['fecha'],
  //     _sum: { total: true },
  //     where: whereClause,
  //   });

  //   const meses = [
  //     'enero',
  //     'febrero',
  //     'marzo',
  //     'abril',
  //     'mayo',
  //     'junio',
  //     'julio',
  //     'agosto',
  //     'septiembre',
  //     'octubre',
  //     'noviembre',
  //     'diciembre',
  //   ];

  //   const ventasPorMes = Array.from({ length: 12 }, (_, i) => ({
  //     Mes: meses[i],
  //     ventas: 0,
  //   }));

  //   ventas.forEach((venta) => {
  //     const mesIndex = new Date(venta.fecha).getMonth();
  //     ventasPorMes[mesIndex].ventas += Number(venta._sum.total || 0);
  //   });

  //   return ventasPorMes;
  // }

  // async getResumen(userId: string) {
  //   const hoy = new Date();
  //   const inicioDia = new Date(
  //     hoy.getFullYear(),
  //     hoy.getMonth(),
  //     hoy.getDate(),
  //   );
  //   const finDia = new Date(
  //     hoy.getFullYear(),
  //     hoy.getMonth(),
  //     hoy.getDate(),
  //     23,
  //     59,
  //     59,
  //   );

  //   const usuario = await this.prisma.usuario.findUnique({
  //     where: { codigo: userId },
  //     select: {
  //       id: true,
  //       rol: true,
  //       empresaId: true,
  //       nombres: true,
  //     },
  //   });

  //   if (!usuario) throw new Error('Usuario no encontrado');

  //   const { rol, empresaId, id: dbUserId, nombres } = usuario;

  //   const empresa = await this.prisma.empresa.findUnique({
  //     where: { id: empresaId },
  //   });

  //   const totalClientes = await this.prisma.clienteEmpresa.count({
  //     where: {
  //       empresaId,
  //       ...(rol !== 'admin' && { vendedorId: dbUserId }),
  //     },
  //   });

  //   const totalRecibos = await this.prisma.recibo
  //     .aggregate({
  //       _sum: { valor: true },
  //       where:
  //         rol === 'admin'
  //           ? {
  //               vendedor: { empresaId },
  //               creado: { gte: inicioDia, lte: finDia },
  //             }
  //           : {
  //               usuarioId: dbUserId,
  //               creado: { gte: inicioDia, lte: finDia },
  //             },
  //     })
  //     .then((res) => res._sum.valor ?? 0);

  //   const totalVentas = await this.prisma.pedido
  //     .aggregate({
  //       _sum: { total: true },
  //       where:
  //         rol === 'admin'
  //           ? {
  //               vendedor: { empresaId },
  //               fecha: { gte: inicioDia, lte: finDia },
  //             }
  //           : {
  //               vendedorId: dbUserId,
  //               fecha: { gte: inicioDia, lte: finDia },
  //             },
  //     })
  //     .then((res) => res._sum.total ?? 0);

  //   return {
  //     empresa: {
  //       nit: empresa?.nit,
  //       nombreComercial: empresa?.nombreComercial,
  //       telefono: empresa?.telefono,
  //     },
  //     usuario: {
  //       rol,
  //       nombres,
  //     },
  //     totalClientes,
  //     totalRecibos,
  //     totalVentas,
  //   };
  // }
}
