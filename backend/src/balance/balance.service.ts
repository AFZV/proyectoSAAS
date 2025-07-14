import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { CrearAjusteManualDto } from './dto/create-ajuste.dto';

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
        (cliente) => cliente.id === saldo.idCliente
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
    const { nombre, empresaId } = usuario;

    if (!idCliente || !usuario) {
      throw new BadRequestException(
        'El id del usuario y el usuario son requeridos'
      );
    }

    const cliente = await this.prisma.cliente.findUnique({
      where: { id: idCliente },
    });

    if (!cliente) {
      throw new BadRequestException(
        'El cliente con el id proporcionado no existe'
      );
    }

    const movimientos = await this.prisma.movimientosCartera.findMany({
      where: {
        idCliente,
        empresaId,
      },
      select: {
        valorMovimiento: true,
        tipoMovimientoOrigen: true,
      },
    });

    // Calcular el balance
    let total = 0;

    for (const mov of movimientos) {
      if (mov.tipoMovimientoOrigen === 'PEDIDO') {
        total += mov.valorMovimiento;
      } else if (
        mov.tipoMovimientoOrigen === 'RECIBO' ||
        mov.tipoMovimientoOrigen === 'AJUSTE_MANUAL'
      ) {
        total -= mov.valorMovimiento;
      }
    }

    return {
      cliente,
      saldo: total,
      nombre,
    };
  }

  async movimientosCarteraCliente(idCliente: string, usuario: UsuarioPayload) {
    if (!usuario || !idCliente)
      throw new BadRequestException(
        `Los datos del cliente y el usuario son requeridos`
      );

    const { empresaId } = usuario;

    const movimientos = await this.prisma.movimientosCartera.findMany({
      where: { empresaId, idCliente },
      include: {
        pedido: { select: { id: true } },
        recibo: { select: { id: true } },
      },
      orderBy: {
        fechaMovimientoCartera: 'desc',
      },
    });

    if (!movimientos.length) {
      throw new NotFoundException('No hay movimientos para este cliente');
    }

    const resultado = movimientos.map((m) => ({
      fecha: m.fechaMovimientoCartera,
      valorMovimiento: m.valorMovimiento,
      tipoMovimiento: m.tipoMovimientoOrigen,
      referencia: m.pedido?.id ?? m.recibo?.id ?? 'Sin referencia',
    }));

    return { movimientos: resultado };
  }
  async ajusteManual(data: CrearAjusteManualDto, usuario: UsuarioPayload) {
    if (!usuario) {
      throw new UnauthorizedException('Usuario no autorizado');
    }

    const { clienteId, pedidos, observacion } = data;
    const { empresaId, id } = usuario;

    if (!pedidos || pedidos.length === 0) {
      throw new BadRequestException(
        'Debes enviar al menos un pedido para ajustar'
      );
    }

    const totalAjustado = pedidos.reduce(
      (acum, pedido) => acum + pedido.valorAplicado,
      0
    );

    const movimiento = await this.prisma.movimientosCartera.create({
      data: {
        empresaId,
        idCliente: clienteId,
        valorMovimiento: totalAjustado,
        tipoMovimientoOrigen: 'AJUSTE_MANUAL',
        idUsuario: id,
        observacion,
      },
    });

    // Registrar detalles del ajuste
    await this.prisma.detalleAjusteCartera.createMany({
      data: pedidos.map((pedido) => ({
        idMovimiento: movimiento.idMovimientoCartera,
        idPedido: pedido.pedidoId,
        valor: pedido.valorAplicado,
      })),
    });

    return {
      message: 'Ajuste manual registrado correctamente',
      movimiento,
    };
  }

  async stats(usuario: UsuarioPayload, clienteId: string) {
    if (!usuario) {
      throw new UnauthorizedException('Usuario no autorizado');
    }

    const { empresaId } = usuario;

    const saldo = await this.saldoPorCliente(clienteId, usuario);
    const totalSaldo = saldo.saldo;

    // Total de abonos: RECIBO + AJUSTE_MANUAL
    const totalAbonos = await this.prisma.movimientosCartera.aggregate({
      where: {
        empresaId,
        idCliente: clienteId,
        tipoMovimientoOrigen: {
          in: ['RECIBO', 'AJUSTE_MANUAL'],
        },
      },
      _sum: {
        valorMovimiento: true,
      },
    });

    // Total de cargos: PEDIDO
    const totalCargos = await this.prisma.movimientosCartera.aggregate({
      where: {
        empresaId,
        idCliente: clienteId,
        tipoMovimientoOrigen: 'PEDIDO',
      },
      _sum: {
        valorMovimiento: true,
      },
    });
    const respuesta = {
      totalSaldo,
      totalNegativos: totalAbonos._sum.valorMovimiento ?? 0,
      totalPositivos: totalCargos._sum.valorMovimiento ?? 0,
    };

    console.log('service respondiendo con el object', respuesta);

    return {
      totalSaldo,
      totalNegativos: totalAbonos._sum.valorMovimiento ?? 0,
      totalPositivos: totalCargos._sum.valorMovimiento ?? 0,
    };
  }
}
