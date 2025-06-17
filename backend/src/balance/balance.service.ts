import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';

@Injectable()
export class BalanceService {
  constructor(private prisma: PrismaService) {}
  //retorna el saldo total por cliente solo clientes con deuda >0 y los ordena por nombre
  async ctasPorCobrar(usuario: UsuarioPayload) {
    if (!usuario) throw new BadRequestException('El usuario es requerido');
    const { empresaId } = usuario;
    const saldos = await this.prisma.movimientosCartera.groupBy({
      by: ['idCliente'],
      _sum: { valorMovimiento: true },
      where: { empresaId },
      having: {
        valorMovimiento: {
          _sum: { gt: 0 }, // Solo clientes que deben
        },
      },
    });
    const clientes = await this.prisma.cliente.findMany({
      where: {
        id: { in: saldos.map((saldo) => saldo.idCliente) },
      },
    });
    const resultado = saldos.map((saldo) => {
      const cliente = clientes.find(
        (cliente) => cliente.id === saldo.idCliente,
      );
      return {
        clienteId: saldo.idCliente,
        nombre: `${cliente?.nombre} ${cliente?.apellidos}`,
        razonSocial: cliente?.rasonZocial,
        nit: cliente?.nit,
        ciudad: cliente?.ciudad,
        totalDeuda: saldo._sum.valorMovimiento ?? 0,
      };
    });
    // Ordenar por nombre A → Z
    return resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
  ///obtiene el saldo de cartera de un cliente el saldo total
  async saldoPorCliente(idCliente: string, usuario: UsuarioPayload) {
    if (!idCliente || !usuario)
      throw new BadRequestException(
        'el id del usuario y el usuario es requerido',
      );
    const { empresaId } = usuario;
    const cliente = await this.prisma.cliente.findUnique({
      where: {
        id: idCliente,
      },
    });
    if (!cliente)
      throw new BadRequestException(
        'El cliente con el id proporcionado no existe',
      );
    const saldo = await this.prisma.movimientosCartera.groupBy({
      by: ['idCliente'],
      _sum: { valorMovimiento: true },
      where: { empresaId: empresaId, idCliente: idCliente },
      having: {
        valorMovimiento: {
          _sum: { gt: 0 }, // Solo clientes que deben
        },
      },
    });
    if (Number(saldo) <= 0) {
      return {
        messagge: `El cliente :${cliente.nombre} con nit:${cliente.nit} no tiene deuda actualmente`,
      };
    }
    return {
      cliente: cliente,
      saldo: saldo,
    };
  }

  async movimientosCarteraCliente(idCliente: string, usuario: UsuarioPayload) {
    if (!usuario || !idCliente)
      throw new BadRequestException(
        `los datos del cliente y el usuario son requeridos`,
      );
    const { empresaId } = usuario;
    const movimientos = await this.prisma.movimientosCartera.findMany({
      where: { empresaId: empresaId, idCliente: idCliente },
      include: {
        pedido: true,
        recibo: true,
      },
    });
    return movimientos;
  }
}
