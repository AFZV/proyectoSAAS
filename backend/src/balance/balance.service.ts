import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { CrearAjusteManualDto } from './dto/create-ajuste.dto';

type MovimientoClienteDTO = {
  id: string;
  fecha: Date;
  tipo: 'Factura' | 'Recaudo' | 'Nota crédito' | 'Ajuste';
  numero: string;
  monto: number; // + factura/ajuste, - recaudo/nota crédito
  saldo: number; // saldo acumulado
  descripcion?: string;
  vencimiento?: Date | null;
  pedidosIds?: string[];
};

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
    if (!usuario || !idCliente) {
      throw new BadRequestException(
        'Los datos del cliente y el usuario son requeridos'
      );
    }

    const { empresaId } = usuario;

    const movimientos = await this.prisma.movimientosCartera.findMany({
      where: { empresaId, idCliente },
      include: {
        pedido: { select: { id: true } },
        recibo: {
          select: {
            id: true,
            detalleRecibo: { select: { idPedido: true, valorTotal: true } },
          },
        },
        detalleAjusteCartera: { select: { idPedido: true, valor: true } },
      },
      orderBy: { fechaMovimientoCartera: 'asc' }, // cronológico asc para saldo si lo necesitas
    });

    if (!movimientos.length) {
      throw new NotFoundException('No hay movimientos para este cliente');
    }

    type Row = {
      fecha: Date;
      valorMovimiento: number;
      tipoMovimiento: 'PEDIDO' | 'RECIBO' | 'AJUSTE_MANUAL';
      referencia: string;
      pedidoId?: string | null;
    };

    const resultado: Row[] = [];

    // 👇 Evitar duplicar explosiones por el mismo recibo/ajuste
    const recibosProcesados = new Set<string>();
    const ajustesProcesados = new Set<string>();

    for (const m of movimientos) {
      const tipo =
        (m.tipoMovimientoOrigen as
          | 'PEDIDO'
          | 'RECIBO'
          | 'AJUSTE_MANUAL'
          | null) ??
        (m.pedido ? 'PEDIDO' : m.recibo ? 'RECIBO' : 'AJUSTE_MANUAL');

      if (tipo === 'AJUSTE_MANUAL') {
        const claveAjuste = m.idMovimientoCartera;
        if (ajustesProcesados.has(claveAjuste)) {
          continue; // ya explotado
        }
        ajustesProcesados.add(claveAjuste);

        const dets = m.detalleAjusteCartera ?? [];
        if (dets.length > 0) {
          for (const d of dets) {
            resultado.push({
              fecha: m.fechaMovimientoCartera,
              valorMovimiento: Number(d.valor || 0),
              tipoMovimiento: 'AJUSTE_MANUAL',
              referencia: claveAjuste, // misma ref para agrupar
              pedidoId: d.idPedido ?? null, // pedido afectado
            });
          }
        } else {
          // ajuste sin detalles: una sola fila
          resultado.push({
            fecha: m.fechaMovimientoCartera,
            valorMovimiento: Number(m.valorMovimiento || 0),
            tipoMovimiento: 'AJUSTE_MANUAL',
            referencia: claveAjuste,
            pedidoId: null,
          });
        }
      } else if (tipo === 'RECIBO') {
        const idRec = m.recibo?.id;
        if (idRec && recibosProcesados.has(idRec)) {
          continue; // ya explotado este recibo
        }
        if (idRec) recibosProcesados.add(idRec);

        const dets = m.recibo?.detalleRecibo ?? [];
        if (dets.length > 0) {
          for (const d of dets) {
            resultado.push({
              fecha: m.fechaMovimientoCartera,
              valorMovimiento: Number(d.valorTotal || 0),
              tipoMovimiento: 'RECIBO',
              referencia: idRec || `REC:${m.idMovimientoCartera}`, // agrupa por recibo
              pedidoId: d.idPedido ?? null, // pedido afectado
            });
          }
        } else {
          // recibo sin detalles: una sola fila
          resultado.push({
            fecha: m.fechaMovimientoCartera,
            valorMovimiento: Number(m.valorMovimiento || 0),
            tipoMovimiento: 'RECIBO',
            referencia: idRec || `REC:${m.idMovimientoCartera}`,
            pedidoId: null,
          });
        }
      } else {
        // PEDIDO: no se agrupa; una fila
        resultado.push({
          fecha: m.fechaMovimientoCartera,
          valorMovimiento: Number(m.valorMovimiento || 0),
          tipoMovimiento: 'PEDIDO',
          referencia: m.pedido?.id ?? `PED:${m.idMovimientoCartera}`,
          pedidoId: m.pedido?.id ?? null,
        });
      }
    }

    // Si quieres devolver ya en el orden que pintas (desc):
    resultado.sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );

    return { movimientos: resultado };
  }

  async ajusteManual(data: CrearAjusteManualDto, usuario: UsuarioPayload) {
    if (!usuario) throw new UnauthorizedException('Usuario no autorizado');

    const { clienteId, pedidos, observacion } = data;
    const { empresaId, id: userId, rol } = usuario;

    if (!Array.isArray(pedidos) || pedidos.length === 0) {
      throw new BadRequestException(
        'Debes enviar al menos un pedido para ajustar'
      );
    }

    // Normaliza/valida pedidos
    const pedidosLimpios = pedidos.map((p) => ({
      pedidoId: String(p.pedidoId),
      valorAplicado: Number(p.valorAplicado || 0),
    }));
    if (pedidosLimpios.some((p) => !p.pedidoId || p.valorAplicado <= 0)) {
      throw new BadRequestException(
        'Todos los pedidos deben tener valorAplicado > 0'
      );
    }

    // 1) Trae los pedidos para validar pertenencia, empresa y rol
    const pedidosDb = await this.prisma.pedido.findMany({
      where: {
        id: { in: pedidosLimpios.map((x) => x.pedidoId) },
        empresaId,
        clienteId, // todos deben ser del mismo cliente
        ...(rol !== 'admin' ? { usuarioId: userId } : {}),
      },
      select: { id: true, total: true },
    });
    const idsEncontrados = new Set(pedidosDb.map((x) => x.id));
    const faltantes = pedidosLimpios.filter(
      (x) => !idsEncontrados.has(x.pedidoId)
    );
    if (faltantes.length) {
      throw new BadRequestException(
        'Hay pedidos inválidos o fuera de tu alcance'
      );
    }

    // 2) (Opcional fuerte) Calcula saldo pendiente por pedido y evita sobreajuste
    //    Si ya tienes un endpoint que lo sirve, puedes replicar aquí la lógica de saldo real.
    //    Aquí solo demuestro una validación básica sumando abonos+ajustes previos:
    const ajustesPrevios = await this.prisma.detalleAjusteCartera.groupBy({
      by: ['idPedido'],
      where: { idPedido: { in: pedidosLimpios.map((x) => x.pedidoId) } },
      _sum: { valor: true },
    });
    const mapaAjustes = new Map(
      ajustesPrevios.map((r) => [r.idPedido!, Number(r._sum.valor || 0)])
    );

    const abonosPrevios = await this.prisma.detalleRecibo.groupBy({
      by: ['idPedido'],
      where: { idPedido: { in: pedidosLimpios.map((x) => x.pedidoId) } },
      _sum: { valorTotal: true },
    });
    const mapaAbonos = new Map(
      abonosPrevios.map((r) => [r.idPedido, Number(r._sum.valorTotal || 0)])
    );

    const pedidoSaldoMap = new Map<string, number>();
    for (const p of pedidosDb) {
      const abonos = mapaAbonos.get(p.id) ?? 0;
      const ajustes = -(mapaAjustes.get(p.id) ?? 0); // ojo: tu lógica trata ajustes como NEGATIVOS al sumar
      const saldo = Math.max(0, Number(p.total || 0) - abonos - ajustes); // saldo disponible antes del nuevo ajuste
      pedidoSaldoMap.set(p.id, saldo);
    }
    // Verifica que no intenten aplicar más que el saldo disponible (si tu regla lo requiere)
    const sobreajuste = pedidosLimpios.find(
      (x) => (pedidoSaldoMap.get(x.pedidoId) ?? 0) < x.valorAplicado
    );
    if (sobreajuste) {
      throw new BadRequestException(
        `El pedido ${sobreajuste.pedidoId.slice(0, 6)} no tiene saldo suficiente para este ajuste`
      );
    }

    const totalAjustado = pedidosLimpios.reduce(
      (acc, p) => acc + p.valorAplicado,
      0
    );

    // 3) Ejecuta TODO en una transacción
    const result = await this.prisma.$transaction(async (tx) => {
      const movimiento = await tx.movimientosCartera.create({
        data: {
          empresaId,
          idCliente: clienteId,
          valorMovimiento: totalAjustado,
          tipoMovimientoOrigen: 'AJUSTE_MANUAL',
          idUsuario: userId,
          observacion: observacion?.trim() || 'Ajuste manual',
        },
      });

      const { count } = await tx.detalleAjusteCartera.createMany({
        data: pedidosLimpios.map((p) => ({
          idMovimiento: movimiento.idMovimientoCartera,
          idPedido: p.pedidoId,
          valor: p.valorAplicado,
        })),
      });

      if (count !== pedidosLimpios.length) {
        // fuerza rollback
        throw new Error(
          'No se pudieron registrar todos los detalles del ajuste'
        );
      }

      return { movimiento, count };
    });

    return {
      message: `Ajuste manual registrado (${result.count} detalle/s)`,
      movimiento: result.movimiento,
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

    return {
      totalSaldo,
      totalNegativos: totalAbonos._sum.valorMovimiento ?? 0,
      totalPositivos: totalCargos._sum.valorMovimiento ?? 0,
    };
  }

  async statatsVencimientos(usuario: UsuarioPayload) {
    if (!usuario) throw new UnauthorizedException('Usuario no autorizado');

    const { empresaId } = usuario;
    const ahora = new Date();
    const hoy = new Date(ahora);
    hoy.setHours(0, 0, 0, 0);

    const [row] = await this.prisma.$queryRaw<
      { vencidos: bigint; vencen_hoy: bigint }[]
    >`
    WITH base AS (
      SELECT
        p."id",
        (p."fechaEnvio" + (COALESCE(p."credito", 0)::int * INTERVAL '1 day')) AS due_at
      FROM "Pedido" p
      WHERE p."empresaId" = ${empresaId}
        AND p."fechaEnvio" IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM "EstadoPedido" e
          WHERE e."pedidoId" = p."id" AND e."estado" = 'ENVIADO'
        )
    ),
    limites AS (
      SELECT
        date_trunc('day', ${hoy}::timestamp) AS inicio_hoy,
        (date_trunc('day', ${hoy}::timestamp) + INTERVAL '1 day' - INTERVAL '1 millisecond') AS fin_hoy
    )
    SELECT
      COUNT(*) FILTER (WHERE b.due_at < ${ahora}::timestamp)::bigint          AS vencidos,
      COUNT(*) FILTER (WHERE b.due_at >= l.inicio_hoy AND b.due_at <= l.fin_hoy)::bigint AS vencen_hoy
    FROM base b
    CROSS JOIN limites l;
  `;

    const vencidos = Number(row?.vencidos ?? 0n);
    const vencenHoy = Number(row?.vencen_hoy ?? 0n);

    // Σ cargos (PEDIDO)
    const cargosAgg = await this.prisma.movimientosCartera.aggregate({
      where: { empresaId, tipoMovimientoOrigen: 'PEDIDO' },
      _sum: { valorMovimiento: true },
    });
    const cargos = Number(cargosAgg._sum.valorMovimiento ?? 0);

    // Σ abonos (RECIBO, AJUSTE_MANUAL)
    const abonosAgg = await this.prisma.movimientosCartera.aggregate({
      where: {
        empresaId,
        tipoMovimientoOrigen: { in: ['RECIBO', 'AJUSTE_MANUAL'] },
      },
      _sum: { valorMovimiento: true },
    });
    const abonos = Number(abonosAgg._sum.valorMovimiento ?? 0);

    const totalPorCobrar = cargos - abonos;

    return {
      vencidos,
      vencenHoy,
      totalPorCobrar,
    };
  }

  async saldosPorCliente(usuario: UsuarioPayload) {
    if (!usuario) throw new UnauthorizedException('Usuario no autorizado');

    const { empresaId, id: userId, rol } = usuario;

    const scopePedido =
      rol === 'admin' ? { empresaId } : { empresaId, usuarioId: userId };

    const scopeAjusteMovimiento =
      rol === 'admin' ? { empresaId } : { empresaId, idUsuario: userId };

    // Pedidos facturados con total > 0
    const pedidos = await this.prisma.pedido.findMany({
      where: {
        ...scopePedido,
        total: { gt: 0 },
        estados: { some: { estado: 'FACTURADO' } },
      },
      select: {
        id: true,
        clienteId: true,
        total: true,
        detalleRecibo: { select: { valorTotal: true } },
        cliente: {
          select: {
            id: true,
            nombre: true,
            rasonZocial: true,
            nit: true,
            ciudad: true,
            telefono: true,
            email: true,
          },
        },
      },
    });

    // Ajustes manuales por pedido
    const ajustesPorPedidoRows =
      await this.prisma.detalleAjusteCartera.findMany({
        where: {
          idPedido: { not: null },
          movimiento: {
            ...scopeAjusteMovimiento,
            tipoMovimientoOrigen: 'AJUSTE_MANUAL',
          },
        },
        select: { idPedido: true, valor: true },
      });

    const ajustesPorPedido = new Map<string, number>();
    for (const a of ajustesPorPedidoRows) {
      if (!a.idPedido) continue;
      const neg = -Math.abs(Number(a.valor || 0));
      ajustesPorPedido.set(
        a.idPedido,
        (ajustesPorPedido.get(a.idPedido) ?? 0) + neg
      );
    }

    // Ajustes globales (idPedido == null)
    const ajustesGlobalesRows = await this.prisma.detalleAjusteCartera.findMany(
      {
        where: {
          idPedido: null,
          movimiento: {
            ...scopeAjusteMovimiento,
            tipoMovimientoOrigen: 'AJUSTE_MANUAL',
          },
        },
        select: {
          valor: true,
          movimiento: { select: { idCliente: true } },
        },
      }
    );

    const ajustesGlobalesPorCliente = new Map<string, number>();
    for (const ag of ajustesGlobalesRows) {
      const cId = ag.movimiento?.idCliente;
      if (!cId) continue;
      const neg = -Math.abs(Number(ag.valor || 0));
      ajustesGlobalesPorCliente.set(
        cId,
        (ajustesGlobalesPorCliente.get(cId) ?? 0) + neg
      );
    }

    // Construcción de saldos por cliente
    const porCliente = new Map<
      string,
      {
        idCliente: string;
        nombre: string;
        identificacion?: string;
        ciudad?: string;
        telefono?: string;
        email?: string;
        saldoPendienteCOP: number;
      }
    >();

    for (const p of pedidos) {
      if (!p.clienteId) continue;

      const cliente = p.cliente;
      if (!porCliente.has(p.clienteId)) {
        porCliente.set(p.clienteId, {
          idCliente: p.clienteId,
          nombre: cliente?.rasonZocial || cliente?.nombre || 'Sin nombre',
          identificacion: cliente?.nit ?? undefined,
          ciudad: cliente?.ciudad ?? undefined,
          telefono: cliente?.telefono ?? undefined,
          email: cliente?.email ?? undefined,
          saldoPendienteCOP: 0,
        });
      }

      const entry = porCliente.get(p.clienteId)!;
      const total = Number(p.total || 0);
      const abonado = p.detalleRecibo.reduce(
        (sum, d) => sum + Number(d.valorTotal || 0),
        0
      );
      const ajusteNeg = ajustesPorPedido.get(p.id) ?? 0;
      const saldoPedido = Math.max(0, total - abonado + ajusteNeg);

      entry.saldoPendienteCOP += saldoPedido;
    }

    // Aplicar ajustes globales
    for (const [cId, entry] of porCliente) {
      const ag = ajustesGlobalesPorCliente.get(cId) ?? 0;
      entry.saldoPendienteCOP = Math.max(0, entry.saldoPendienteCOP + ag);
    }

    // Respuesta final: SOLO clientes con saldo > 0
    const items = Array.from(porCliente.values())
      .filter((x) => x.saldoPendienteCOP > 0)
      .sort((a, b) => b.saldoPendienteCOP - a.saldoPendienteCOP);

    return items;
  }
  async movimientosCliente(
    usuario: UsuarioPayload,
    clienteId: string
  ): Promise<MovimientoClienteDTO[]> {
    if (!usuario) throw new UnauthorizedException('Usuario no autorizado');

    const { empresaId } = usuario;

    // Alcance por rol:
    // admin  -> todos los movimientos de la empresa
    // vendedor -> solo movimientos suyos (idUsuario) o enlazados a pedido/recibo creados por él
    // const whereBase: any = {
    //   empresaId,
    //   idCliente: clienteId,
    //   // si manejas anulaciones, agrega: anulado: false
    // };

    // const whereRol =
    //   rol === 'admin'
    //     ? {}
    //     : {
    //         OR: [
    //           { idUsuario: userId },
    //           { pedido: { usuarioId: userId } },
    //           { recibo: { usuarioId: userId } },
    //         ],
    //       };

    // Traemos los movimientos con lo mínimo necesario para construir el DTO
    const movs = await this.prisma.movimientosCartera.findMany({
      where: { empresaId: empresaId, idCliente: clienteId },
      select: {
        idMovimientoCartera: true,
        idPedido: true,
        idRecibo: true,
        idUsuario: true,
        fechaMovimientoCartera: true,
        valorMovimiento: true,
        observacion: true,
        tipoMovimientoOrigen: true, // PEDIDO | RECIBO | AJUSTE_MANUAL
        detalleAjusteCartera: {
          select: { idPedido: true, valor: true },
        },
        pedido: {
          select: {
            id: true,
            usuarioId: true,
            fechaPedido: true,
            fechaEnvio: true,
            credito: true,
          },
        },
        recibo: {
          select: {
            id: true,
            usuarioId: true,
            Fechacrecion: true,
            tipo: true,
            concepto: true,
            // 👇 IMPORTANTE: trae los pedidos implicados
            detalleRecibo: {
              select: {
                idPedido: true,
                valorTotal: true,
                estado: true,
                saldoPendiente: true,
                pedido: { select: { id: true } }, // opcional
              },
            },
          },
        },
      },
      orderBy: { fechaMovimientoCartera: 'asc' },
    });

    // Mapeo a DTO del front
    const mapped = movs.map<MovimientoClienteDTO>((m) => {
      const tipo: MovimientoClienteDTO['tipo'] =
        m.tipoMovimientoOrigen === 'PEDIDO'
          ? 'Factura'
          : m.tipoMovimientoOrigen === 'RECIBO'
            ? 'Recaudo'
            : m.tipoMovimientoOrigen === 'AJUSTE_MANUAL'
              ? 'Ajuste'
              : 'Nota crédito';

      const fechaOrigen =
        tipo === 'Factura'
          ? (m.pedido?.fechaPedido ?? m.fechaMovimientoCartera)
          : tipo === 'Recaudo'
            ? (m.recibo?.Fechacrecion ?? m.fechaMovimientoCartera)
            : m.fechaMovimientoCartera;

      const diasCredito = Number(m.pedido?.credito ?? 0);
      const vencimiento =
        tipo === 'Factura' && m.pedido?.fechaEnvio
          ? new Date(
              new Date(m.pedido.fechaEnvio).getTime() +
                Math.trunc(diasCredito) * 24 * 60 * 60 * 1000
            )
          : null;

      // 👇 Pedidos implicados
      const pedidosIdsFromRecibo =
        m.recibo?.detalleRecibo?.map((d) => d.idPedido).filter(Boolean) ?? [];

      // Número visible
      const numero =
        (m.idPedido ? `${m.idPedido.slice(0, 6)}` : null) ??
        (m.idRecibo ? `${m.idRecibo.slice(0, 6)}` : null) ??
        `NC-${m.idMovimientoCartera.slice(0, 6)}`;

      const descripcion =
        m.observacion ??
        (tipo === 'Factura'
          ? 'Factura generada'
          : tipo === 'Recaudo'
            ? m.recibo?.concepto || 'Recaudo'
            : 'Ajuste de cartera');

      const ajusteDetalles =
        m.tipoMovimientoOrigen === 'AJUSTE_MANUAL'
          ? (m.detalleAjusteCartera ?? []).map((d) => ({
              pedidoId: d.idPedido,
              valor: Number(d.valor || 0),
            }))
          : [];

      let monto = Number(m.valorMovimiento || 0);
      if (tipo === 'Recaudo' || tipo === 'Nota crédito') {
        monto = -Math.abs(monto);
      } else if (tipo === 'Ajuste') {
        monto = -Math.abs(monto);
      } else {
        monto = +Math.abs(monto);
      }

      return {
        id: m.idMovimientoCartera,
        fecha: fechaOrigen ?? m.fechaMovimientoCartera,
        tipo,
        numero,
        monto,
        saldo: 0,
        descripcion,
        vencimiento,
        // Mantén compatibilidad:
        pedidoId: m.idPedido ?? pedidosIdsFromRecibo[0] ?? null,
        // Nuevo campo opcional con TODOS los pedidos implicados:
        pedidosIds: pedidosIdsFromRecibo.length
          ? pedidosIdsFromRecibo
          : m.idPedido
            ? [m.idPedido]
            : [],
        pedidosIdsAjuste: ajusteDetalles.length
          ? ajusteDetalles.map((d) => d.pedidoId)
          : m.idPedido
            ? [m.idPedido]
            : [],
        ajusteDetalles, // 👈 NUEVO: [{ pedidoId, valor }]
      };
    });

    // Orden final por la "fecha" consolidada (sin que el front tenga que ordenar)
    mapped.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    // Saldo acumulado
    let running = 0;
    for (const it of mapped) {
      running += it.monto;
      it.saldo = running;
    }

    return mapped;
  }
}
