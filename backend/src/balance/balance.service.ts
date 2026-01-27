import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { CrearAjusteManualDto } from './dto/create-ajuste.dto';
import { Prisma, PrismaClient } from '@prisma/client';
import { OrigenMovimientoEnum } from '@prisma/client';

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
export type VencimientoFacturaClienteDTO = {
  idPedido: string;
  numero: string;
  fechaEmision: string;
  fechaVencimiento: string;
  total: number;
  saldo: number;
  cliente: {
    rasonZocial: string;
    nit?: string | null;
    telefono?: string | null;
    email?: string | null;
  };
  diasRestantes?: number;
  estado?: string | null;
};
type DbClient = Prisma.TransactionClient | PrismaClient;
@Injectable()
export class BalanceService {
  constructor(private prisma: PrismaService) {}
  // Saldo de un pedido (derivado)
  async getSaldoPedido(db: DbClient, pedidoId: string) {
    const pedido = await db.pedido.findUnique({
      where: { id: pedidoId },
      select: { total: true },
    });

    const rec = await db.detalleRecibo.aggregate({
      where: { idPedido: pedidoId },
      _sum: { valorTotal: true },
    });

    const aj = await db.detalleAjusteCartera.aggregate({
      where: { idPedido: pedidoId },
      _sum: { valor: true }, // incluye reversos (negativos)
    });

    const total = Number(pedido?.total ?? 0);
    const recibos = Number(rec._sum.valorTotal ?? 0);
    const ajustes = Number(aj._sum.valor ?? 0);

    // Tu regla (ajustes restan del saldo): saldo = total - recibos - ajustes
    return Math.max(0, total - recibos - ajustes);
  }

  // Saldo total del cliente (suma de saldos de pedidos)
  async calcularSaldoCliente(
    db: DbClient,
    clienteId: string,
    empresaId: string
  ) {
    const pedidos = await db.pedido.findMany({
      where: { empresaId, clienteId },
      select: { id: true },
    });

    let saldo = 0;
    for (const p of pedidos) {
      saldo += await this.getSaldoPedido(db, p.id);
    }
    return saldo;
  }

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
            concepto: true,
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
      observaciones?: string | null; // 👈 NUEVO
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
          continue;
        }
        ajustesProcesados.add(claveAjuste);

        const dets = m.detalleAjusteCartera ?? [];
        if (dets.length > 0) {
          for (const d of dets) {
            resultado.push({
              fecha: m.fechaMovimientoCartera,
              valorMovimiento: Number(d.valor || 0),
              tipoMovimiento: 'AJUSTE_MANUAL',
              referencia: claveAjuste,
              pedidoId: d.idPedido ?? null,
              observaciones: (m.observacion ?? '').trim() || null, // 👈 AQUÍ
            });
          }
        } else {
          resultado.push({
            fecha: m.fechaMovimientoCartera,
            valorMovimiento: Number(m.valorMovimiento || 0),
            tipoMovimiento: 'AJUSTE_MANUAL',
            referencia: claveAjuste,
            pedidoId: null,
            observaciones: (m.observacion ?? '').trim() || null, // 👈 AQUÍ
          });
        }
      } else if (tipo === 'RECIBO') {
        const idRec = m.recibo?.id;
        if (idRec && recibosProcesados.has(idRec)) {
          continue;
        }
        if (idRec) recibosProcesados.add(idRec);
        const obsRecibo = (m.recibo?.concepto ?? '').trim() || null; // 👈 aquí

        const dets = m.recibo?.detalleRecibo ?? [];
        if (dets.length > 0) {
          for (const d of dets) {
            resultado.push({
              fecha: m.fechaMovimientoCartera,
              valorMovimiento: Number(d.valorTotal || 0),
              tipoMovimiento: 'RECIBO',
              referencia: idRec || `REC:${m.idMovimientoCartera}`,
              pedidoId: d.idPedido ?? null,
              observaciones: obsRecibo,
            });
          }
        } else {
          resultado.push({
            fecha: m.fechaMovimientoCartera,
            valorMovimiento: Number(m.valorMovimiento || 0),
            tipoMovimiento: 'RECIBO',
            referencia: idRec || `REC:${m.idMovimientoCartera}`,
            pedidoId: null,
            observaciones: obsRecibo,
          });
        }
      } else {
        // PEDIDO
        resultado.push({
          fecha: m.fechaMovimientoCartera,
          valorMovimiento: Number(m.valorMovimiento || 0),
          tipoMovimiento: 'PEDIDO',
          referencia: m.pedido?.id ?? `PED:${m.idMovimientoCartera}`,
          pedidoId: m.pedido?.id ?? null,
          observaciones: (m.observacion ?? '').trim() || null, // opcional para pedido
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

  //reversar ajuste manual
  async reversarAjuste(
    ajusteId: string,
    usuario: UsuarioPayload,
    dto?: { motivo?: string }
  ) {
    if (!usuario) throw new UnauthorizedException('Usuario no autorizado');

    const { empresaId, id: userId, rol } = usuario;

    // 1) Ajuste original
    const original = await this.prisma.movimientosCartera.findFirst({
      where: {
        idMovimientoCartera: ajusteId,
        empresaId,
        tipoMovimientoOrigen: 'AJUSTE_MANUAL',
      },
      include: { detalleAjusteCartera: true },
    });
    if (!original)
      throw new NotFoundException('Ajuste no encontrado o no es de tu empresa');

    // 1.a) No permitir reversar un reverso
    if ((original.observacion ?? '').includes('REVERSO_DE:{')) {
      throw new BadRequestException('No puedes reversar un reverso de ajuste.');
    }

    // 2) Permisos
    if (rol !== 'admin' && original.idUsuario !== userId) {
      throw new UnauthorizedException(
        'No tienes permisos para reversar este ajuste'
      );
    }

    // 3) Transacción con lock y chequeo atómico
    const resultado = await this.prisma.$transaction(async (tx) => {
      // 3.a) LOCK asesor por UUID, sin crypto (en Postgres)
      await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(
        ('x' || substr(replace(${ajusteId}, '-', ''), 1, 8))::bit(32)::int,
        ('x' || substr(replace(${ajusteId}, '-', ''), 9, 8))::bit(32)::int
      )
    `;

      // 3.b) ¿ya existe reverso? (chequeo dentro de la misma TX)
      const yaReversado = await tx.movimientosCartera.findFirst({
        where: {
          empresaId,
          observacion: {
            contains: `REVERSO_DE:{${original.idMovimientoCartera}}`,
          },
        },
        select: { idMovimientoCartera: true },
      });
      if (yaReversado)
        throw new BadRequestException('Este ajuste ya fue reversado');

      // 3.c) Crear contra-asiento
      const reverso = await tx.movimientosCartera.create({
        data: {
          empresaId,
          idCliente: original.idCliente,
          idUsuario: userId,
          idPedido: original.idPedido ?? null,
          idRecibo: null,
          valorMovimiento: -Number(original.valorMovimiento || 0),
          tipoMovimientoOrigen: 'AJUSTE_MANUAL',
          observacion: `REVERSO_DE:{${original.idMovimientoCartera}}${dto?.motivo ? ' ' + dto.motivo : ''}`,
        },
      });

      // 3.d) Detalles invertidos
      const detalles = original.detalleAjusteCartera || [];
      if (detalles.length > 0) {
        await tx.detalleAjusteCartera.createMany({
          data: detalles.map((d) => ({
            idMovimiento: reverso.idMovimientoCartera,
            idPedido: d.idPedido,
            valor: -Number(d.valor || 0),
          })),
        });
      }

      // 3.e) Recalcular saldos de pedidos afectados
      const pedidosAfectadosIds = Array.from(
        new Set(detalles.map((d) => d.idPedido).filter(Boolean) as string[])
      );
      const pedidosAfectados = await Promise.all(
        pedidosAfectadosIds.map(async (pedidoId) => ({
          pedidoId,
          saldo: await this.getSaldoPedido(tx, pedidoId),
        }))
      );

      // 3.f) Saldo total del cliente
      const saldoCliente = await this.calcularSaldoCliente(
        tx,
        original.idCliente,
        empresaId
      );

      return { reverso, pedidosAfectados, saldoCliente };
    });

    return { message: 'Ajuste reversado correctamente', ...resultado };
  }

  /**
   * Calcula el saldo del cliente derivando de pedidos, recibos y ajustes.
   * Si tienes otra regla, ajusta aquí.
   */

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

    // const scopeAjusteMovimiento =
    //   rol === 'admin' ? { empresaId } : { empresaId, idUsuario: userId };

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
            apellidos: true, // 👈 faltaba
            rasonZocial: true, // ojo con este nombre en tu schema
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
            empresaId,
            tipoMovimientoOrigen: 'AJUSTE_MANUAL',
          },
        },
        select: {
          idPedido: true,
          valor: true,
          movimiento: { select: { observacion: true } }, // 👈 necesitamos saber si es reverso
        },
      });

    const ajustesPorPedido = new Map<string, number>();
    for (const a of ajustesPorPedidoRows) {
      if (!a.idPedido) continue;
      const v = Math.abs(Number(a.valor || 0));
      const obs = a.movimiento?.observacion || '';
      const esReverso = /\bREVERSO_DE:\{/.test(obs); // 👈 tu convención actual

      const signed = esReverso ? +v : -v; // reverso suma, ajuste normal resta
      ajustesPorPedido.set(
        a.idPedido,
        (ajustesPorPedido.get(a.idPedido) ?? 0) + signed
      );
    }

    // Ajustes globales (idPedido == null)
    const ajustesGlobalesRows = await this.prisma.detalleAjusteCartera.findMany(
      {
        where: {
          idPedido: null,
          movimiento: {
            empresaId,
            tipoMovimientoOrigen: 'AJUSTE_MANUAL',
          },
        },
        select: {
          valor: true,
          movimiento: { select: { idCliente: true, observacion: true } }, // 👈
        },
      }
    );

    const ajustesGlobalesPorCliente = new Map<string, number>();
    for (const ag of ajustesGlobalesRows) {
      const cId = ag.movimiento?.idCliente;
      if (!cId) continue;
      const v = Math.abs(Number(ag.valor || 0));
      const obs = ag.movimiento?.observacion || '';
      const esReverso = /\bREVERSO_DE:\{/.test(obs); // 👈

      const signed = esReverso ? +v : -v;
      ajustesGlobalesPorCliente.set(
        cId,
        (ajustesGlobalesPorCliente.get(cId) ?? 0) + signed
      );
    }

    // Construcción de saldos por cliente
    type ItemClienteSaldo = {
      idCliente: string;
      nombre: string; // visible en tabla (razón social o nombre completo)
      identificacion?: string;
      ciudad?: string;
      telefono?: string;
      email?: string;
      saldoPendienteCOP: number;
      cliente: {
        rasonZocial?: string | null;
        nombre?: string | null;
        apellidos?: string | null;
        identificacion?: string | null;
        ciudad?: string | null;
        telefono?: string | null;
        email?: string | null;
      };
    };

    const porCliente = new Map<string, ItemClienteSaldo>();

    for (const p of pedidos) {
      if (!p.clienteId) continue;

      const c = p.cliente;
      const razon = c?.rasonZocial?.trim() || null;
      const nombres = [c?.nombre, c?.apellidos]
        .filter(Boolean)
        .join(' ')
        .trim();
      const nombreVisible = razon || nombres || '(Sin nombre)';

      if (!porCliente.has(p.clienteId)) {
        porCliente.set(p.clienteId, {
          idCliente: p.clienteId,
          nombre: nombreVisible,
          identificacion: c?.nit ?? undefined,
          ciudad: c?.ciudad ?? undefined,
          telefono: c?.telefono ?? undefined,
          email: c?.email ?? undefined,
          saldoPendienteCOP: 0,
          cliente: {
            rasonZocial: c?.rasonZocial ?? null,
            nombre: c?.nombre ?? null,
            apellidos: c?.apellidos ?? null,
            identificacion: c?.nit ?? null,
            ciudad: c?.ciudad ?? null,
            telefono: c?.telefono ?? null,
            email: c?.email ?? null,
          },
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

    // Solo clientes con saldo > 0
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
        tipo === 'Recaudo'
          ? m.idRecibo
            ? `${m.idRecibo.slice(0, 6)}`
            : `RC-${m.idMovimientoCartera.slice(0, 6)}`
          : tipo === 'Factura'
            ? m.idPedido
              ? `${m.idPedido.slice(0, 6)}`
              : `PD-${m.idMovimientoCartera.slice(0, 6)}`
            : m.idMovimientoCartera
              ? `NC-${m.idMovimientoCartera.slice(0, 6)}`
              : '—';

      const descripcion =
        m.observacion ??
        (tipo === 'Factura'
          ? 'Factura generada'
          : tipo === 'Recaudo'
            ? m.recibo?.concepto || 'Recaudo'
            : 'Ajuste de cartera');

      // ¿Es ajuste y además reverso?
      const esAjuste = m.tipoMovimientoOrigen === 'AJUSTE_MANUAL';
      const esReverso =
        esAjuste &&
        (m.observacion ?? '').toUpperCase().includes('REVERSO_DE:{'); // si tienes campo esReverso/reversoDeId, úsalo

      // Detalle de ajuste con signo correcto por ítem
      const ajusteDetalles = esAjuste
        ? (m.detalleAjusteCartera ?? []).map((d) => ({
            pedidoId: d.idPedido,
            // reverso suma (+), ajuste normal descuenta (-)
            valor: esReverso
              ? +Math.abs(Number(d.valor || 0))
              : -Math.abs(Number(d.valor || 0)),
          }))
        : [];

      // Monto total del movimiento con signo correcto
      let monto = Number(m.valorMovimiento || 0);
      if (tipo === 'Recaudo' || tipo === 'Nota crédito') {
        monto = -Math.abs(monto);
      } else if (tipo === 'Ajuste') {
        monto = esReverso ? +Math.abs(monto) : -Math.abs(monto);
      } else {
        // Factura
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
  async getVencimientosFacturas(
    usuario: UsuarioPayload
  ): Promise<VencimientoFacturaClienteDTO[]> {
    if (!usuario) throw new UnauthorizedException('Usuario no autorizado');

    const DIAS_MORA_VENCIDO = 15; // >=15 días después de VTO => mora (prioridad ALTA)
    const { empresaId, rol } = usuario;

    const pedidos = await this.prisma.pedido.findMany({
      where:
        rol === 'admin'
          ? {
              empresaId,
              estados: { some: { estado: 'FACTURADO' } },
              NOT: { estados: { some: { estado: 'CANCELADO' } } },
            }
          : {
              empresaId,
              usuarioId: usuario.id,
              estados: { some: { estado: 'FACTURADO' } },
              NOT: { estados: { some: { estado: 'CANCELADO' } } },
            },
      select: {
        id: true,
        total: true,
        fechaPedido: true,
        fechaEnvio: true,
        credito: true,
        cliente: {
          select: {
            rasonZocial: true,
            nit: true,
            nombre: true,
            apellidos: true,
            telefono: true,
            email: true,
          },
        },
        estados: { select: { estado: true, fechaEstado: true } },
        detalleRecibo: { select: { valorTotal: true } },
        detalleAjusteCartera: { select: { valor: true } },
      },
    });

    const MS_DIA = 86_400_000;
    const toYMD = (d: Date) => {
      const nd = new Date(d);
      nd.setHours(0, 0, 0, 0);
      return nd;
    };

    const result = pedidos
      .map((p) => {
        // 1) Emisión: cuando se marcó ENVIADO (si existe); si no, fechaEnvio; si no, fechaPedido
        const estadoEnviado = p.estados.find((e) => e.estado === 'ENVIADO');
        const fechaEmision = new Date(
          (estadoEnviado?.fechaEstado as unknown as Date) ??
            (p.fechaEnvio as unknown as Date) ??
            (p.fechaPedido as unknown as Date)
        );

        // 2) Vencimiento = emisión + crédito (fallback 30 días)
        const diasCredito = Number.isFinite(p.credito) ? Number(p.credito) : 30;
        const fechaVenc = new Date(fechaEmision);
        fechaVenc.setDate(fechaVenc.getDate() + diasCredito);

        // 3) Totales
        const totalFactura: number = Number(p.total ?? 0);

        // 4) Abonos desde DetalleRecibo
        const abonos: number = p.detalleRecibo.reduce<number>(
          (acc, d) => acc + (Number(d.valorTotal) || 0),
          0
        );

        // 5) Ajustes (pueden ser ±)
        const ajustesNetos: number = p.detalleAjusteCartera.reduce<number>(
          (acc, d) => acc + (Number(d.valor) || 0),
          0
        );

        // 6) Saldo
        const saldo: number = Math.max(
          0,
          Number((totalFactura - ajustesNetos - abonos).toFixed(2))
        );

        // 7) Último estado
        const lastEstado =
          p.estados
            .slice()
            .sort(
              (a, b) =>
                new Date(b.fechaEstado).getTime() -
                new Date(a.fechaEstado).getTime()
            )[0]?.estado ?? null;

        // 8) Días restantes / vencidos (desde HOY)
        const hoy = toYMD(new Date());
        const diasRestantes = Math.round(
          (toYMD(fechaVenc).getTime() - hoy.getTime()) / MS_DIA
        );
        const diasVencidos = Math.max(
          0,
          Math.round((hoy.getTime() - toYMD(fechaVenc).getTime()) / MS_DIA)
        );

        // 9) Regla de mora (>=15 días después del vencimiento y con saldo)
        const enMora = saldo > 0 && diasVencidos >= DIAS_MORA_VENCIDO;
        const normalizePhoneCO = (raw?: string | null): string | null => {
          if (!raw) return null;
          const digits = raw.replace(/\D/g, ''); // quita todo lo no numérico

          // Ya viene con 57 + 10 dígitos (móvil)
          if (/^57[3]\d{9}$/.test(digits)) return digits;

          // Solo 10 dígitos y parece móvil (inicia con 3) -> anteponer 57
          if (/^[3]\d{9}$/.test(digits)) return `57${digits}`;

          // Quitar ceros iniciales comunes y reintentar
          const noLeadingZeros = digits.replace(/^0+/, '');
          if (/^[3]\d{9}$/.test(noLeadingZeros)) return `57${noLeadingZeros}`;

          // Si vino 57 + algo mal, intenta corregir ceros
          if (/^57[0]+([3]\d{9})$/.test(digits)) {
            const m = digits.match(/^57[0]+([3]\d{9})$/);
            return m ? `57${m[1]}` : null;
          }

          // No es móvil colombiano válido para WhatsApp
          return null;
        };
        const telefonoNormalizado = normalizePhoneCO(p.cliente?.telefono);

        return {
          idPedido: p.id,
          numero: p.id.slice(0, 8).toUpperCase(),
          fechaEmision: fechaEmision.toISOString(),
          fechaVencimiento: fechaVenc.toISOString(),
          total: totalFactura,
          saldo,
          cliente: {
            rasonZocial: p.cliente?.rasonZocial ?? '',
            nit: p.cliente?.nit ?? null,
            nombre: p.cliente?.nombre ?? '',
            apellidos: p.cliente?.apellidos ?? '',
            telefono: telefonoNormalizado,
            email: p.cliente?.email ?? null,
          },
          estado: lastEstado,
          diasRestantes,
          alerta: enMora ? 'MORA_100' : null,
          prioridadCobro: enMora
            ? 'ALTA'
            : diasRestantes < 0
              ? 'MEDIA'
              : 'BAJA',
        } as VencimientoFacturaClienteDTO;
      })
      .filter((f) => f.saldo > 0)
      .sort(
        (a, b) =>
          new Date(a.fechaVencimiento).getTime() -
          new Date(b.fechaVencimiento).getTime()
      );

    return result;
  }
  async getAjustePorId(ajusteId: string, usuario: UsuarioPayload) {
    if (!usuario) throw new UnauthorizedException('Usuario no autorizado');
    const { empresaId } = usuario;

    // Trae el movimiento + detalle + cliente + usuario + pedido
    const ajuste = await this.prisma.movimientosCartera.findFirst({
      where: {
        idMovimientoCartera: ajusteId,
        empresaId,
        tipoMovimientoOrigen: OrigenMovimientoEnum.AJUSTE_MANUAL,
      },
      include: {
        usuario: { select: { id: true, nombre: true, apellidos: true } },
        cliente: {
          select: {
            id: true,
            nit: true,
            rasonZocial: true,
            nombre: true,
            apellidos: true,
          },
        },
        detalleAjusteCartera: {
          select: {
            idDetalleAjuste: true,
            idPedido: true,
            valor: true,
            pedido: { select: { id: true, total: true } },
          },
        },
      },
    });

    if (!ajuste) {
      throw new NotFoundException(
        'Ajuste no encontrado para este tenant o no es AJUSTE_MANUAL'
      );
    }

    // Helper para detectar reverso y extraer el id original (si está anotado)
    const obs = (ajuste.observacion || '').trim();
    const esReverso = /\bREVERSO_DE:\{/.test(obs);

    // Intenta extraer un id dentro del tag REVERSO_DE:{id:...}
    let reversaDeId: string | null = null;
    try {
      // busca algo como REVERSO_DE:{id:xxxxxxxx-....}
      const m = obs.match(/REVERSO_DE:\{\s*id\s*:\s*([0-9a-fA-F-]{8,})\s*\}/);
      if (m && m[1]) reversaDeId = m[1];
    } catch {
      /* noop */
    }

    // Lista de pedidos afectados por el ajuste
    const pedidos = (ajuste.detalleAjusteCartera || [])
      .filter((d) => !!d.idPedido)
      .map((d) => ({
        id: d.idPedido,
        // Puedes mostrar solo los primeros 6 chars en el front
        valor: Number(d.valor) || 0,
      }));

    // Suma total del ajuste (por si lo quieres mostrar destacado)
    const valorTotal = pedidos.reduce((acc, p) => acc + (p.valor || 0), 0);

    // DTO listo para el front (simple y completo)
    const dto = {
      id: ajuste.idMovimientoCartera,
      fecha: ajuste.fechaMovimientoCartera, // Date
      observaciones: ajuste.observacion ?? null,
      esReverso,
      reversaDeId, // null si no hay marca
      usuario: ajuste.usuario
        ? {
            id: ajuste.usuario.id,
            nombre: ajuste.usuario.nombre,
            apellidos: ajuste.usuario.apellidos,
          }
        : null,
      cliente: ajuste.cliente
        ? {
            id: ajuste.cliente.id,
            nit: ajuste.cliente.nit,
            rasonZocial: ajuste.cliente.rasonZocial,
            nombre: ajuste.cliente.nombre,
            apellidos: ajuste.cliente.apellidos,
          }
        : null,
      pedidos, // [{ id, valor }]
      valorTotal, // suma de valores
    };

    return dto;
  }
}
