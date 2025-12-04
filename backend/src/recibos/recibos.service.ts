import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CrearReciboDto } from './dto/create-recibo.dto';
import { UpdateReciboDto } from './dto/update-recibo.dto';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { ResendService } from 'src/resend/resend.service';

import { PdfUploaderService } from 'src/pdf-uploader/pdf-uploader.service';
import { ResumenReciboDto } from 'src/pdf-uploader/dto/resumen-recibo.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { HetznerStorageService } from 'src/hetzner-storage/hetzner-storage.service';
import { ExportRecaudosDto } from './dto/export-recibo.dto';
import * as ExcelJS from 'exceljs';

@Injectable()
export class RecibosService {
  constructor(
    private prisma: PrismaService,
    private pdfUploaderService: PdfUploaderService,
    private resendService: ResendService,
    private cloudinaryService: CloudinaryService,
    private hetznerStorageService: HetznerStorageService
  ) {}

  //helper para validar que el saldo a abonar o actualizar en un recibo no supere el saldo actual

  // recibos.service.ts

  private async validarClienteVendedor(
    idCliente: string,
    usuario: UsuarioPayload
  ) {
    const { id: idUsuario, empresaId, rol } = usuario;
    if (!idCliente || !idUsuario)
      throw new BadRequestException('no se puede validar');
    const relacion = await this.prisma.clienteEmpresa.findFirst({
      where:
        rol === 'admin'
          ? { clienteId: idCliente, empresaId: empresaId }
          : {
              empresaId: empresaId,
              clienteId: idCliente,
              usuarioId: idUsuario,
            },
    });
    if (!relacion)
      throw new UnauthorizedException(
        'El cliente no pertenece a esta empresa o no es su cliente'
      );
    return relacion;
  }
  /** Devuelve true si algún AJUSTE_MANUAL de este recibo ya fue reversado */
  private async existeReversoDeAjusteParaRecibo(
    reciboId: string,
    empresaId: string
  ): Promise<boolean> {
    const short = `#${reciboId.slice(0, 6).toLowerCase()}`;

    // 1) Ubica los AJUSTE_MANUAL "originales" asociados al recibo:
    //    - por idRecibo
    //    - o por texto en observación (legado)
    const originales = await this.prisma.movimientosCartera.findMany({
      where: {
        empresaId,
        tipoMovimientoOrigen: 'AJUSTE_MANUAL',
        OR: [
          { idRecibo: reciboId },
          // legado: "Ajuste (flete/desc) desde recibo #36f96e"
          { observacion: { contains: reciboId, mode: 'insensitive' } },
          { observacion: { contains: short, mode: 'insensitive' } },
        ],
      },
      select: { idMovimientoCartera: true, observacion: true },
    });

    if (!originales.length) return false;

    const originalIds = originales.map((m) => m.idMovimientoCartera);
    const orObservacion: any[] = [
      { observacion: { contains: reciboId, mode: 'insensitive' } },
      { observacion: { contains: short, mode: 'insensitive' } },
    ];
    for (const mid of originalIds) {
      orObservacion.push({
        observacion: { contains: String(mid), mode: 'insensitive' },
      });
    }

    // 2) ¿Existe ALGÚN REVERSO que haga referencia a esos ids/recibo?
    //    Convención esperada en reversos: "REVERSO_DE:{...}"
    const reverso = await this.prisma.movimientosCartera.findFirst({
      where: {
        empresaId,
        tipoMovimientoOrigen: 'AJUSTE_MANUAL',
        AND: [
          { observacion: { startsWith: 'REVERSO_DE:', mode: 'insensitive' } },
          { OR: orObservacion },
        ],
      },
      select: { idMovimientoCartera: true },
    });

    return !!reverso;
  }
  private normalizarRango(inicioStr: string, finStr: string) {
    const inicio = new Date(`${inicioStr}T00:00:00-05:00`);
    const fin = new Date(`${finStr}T23:59:59-05:00`);

    return { inicio, fin };
  }

  //crea un recibo y registra en detalle recibo y los movimientos te cartera correspondiente
  async crearRecibo(data: CrearReciboDto, usuario: UsuarioPayload) {
    if (!usuario) throw new UnauthorizedException('Usuario no autorizado');

    const { clienteId, tipo, concepto, pedidos } = data;
    const { empresaId } = usuario;

    const relacion = await this.validarClienteVendedor(clienteId, usuario);

    if (!Array.isArray(pedidos) || pedidos.length === 0) {
      throw new BadRequestException(
        'Debe asociar al menos un pedido al recibo.'
      );
    }

    const totalAbonado = pedidos.reduce(
      (sum, p) => sum + Number(p.valorAplicado || 0),
      0
    );
    if (totalAbonado <= 0) {
      throw new BadRequestException('El total aplicado debe ser mayor a 0.');
    }

    // ---- Normalización y validaciones de entrada ----
    const ajustePorPedido = new Map<string, number>(); // flete+descuento
    for (const p of pedidos) {
      const f = Number(p.flete || 0);
      const d = Number(p.descuento || 0);
      if (f < 0 || d < 0) {
        throw new BadRequestException(
          'Flete/Descuento no pueden ser negativos.'
        );
      }
      ajustePorPedido.set(p.pedidoId, f + d);
    }

    type DetalleCalculado = {
      idPedido: string;
      valorAplicado: number;
      saldoPendiente: number;
      estado: 'completo' | 'parcial';
      totalPedido: number;
      ajusteAplicado: number; // flete+descuento del payload
    };

    const detalles: DetalleCalculado[] = [];

    // ---- Calcular saldo actual y validar que no se exceda por pedido ----
    for (const p of pedidos) {
      const pedidoId = p.pedidoId;

      // 1) Total del pedido
      const pedidoOriginal = await this.prisma.pedido.findUnique({
        where: { id: pedidoId, empresaId },
        select: { id: true, total: true },
      });
      if (!pedidoOriginal) {
        throw new NotFoundException(`Pedido con ID ${pedidoId} no encontrado`);
      }
      const totalPedido = Number(pedidoOriginal.total || 0);

      // 2) Abonos previos (suma de detalleRecibo.valorTotal del pedido)
      const abonosPreviosAgg = await this.prisma.detalleRecibo.aggregate({
        _sum: { valorTotal: true },
        where: { idPedido: pedidoId },
      });
      const abonadoPrevio = Number(abonosPreviosAgg._sum.valorTotal || 0);

      // 3) Ajustes previos por pedido (DetalleAjusteCartera + movimiento AJUSTE_MANUAL)
      const ajustesRows = await this.prisma.detalleAjusteCartera.findMany({
        where: {
          idPedido: pedidoId,
          movimiento: {
            empresaId,
            tipoMovimientoOrigen: 'AJUSTE_MANUAL',
          },
        },
        select: {
          valor: true,
          movimiento: { select: { observacion: true } },
        },
      });

      // Convención: ajuste normal REDUCE saldo (signo -), reverso SUMA (signo +)
      let ajusteSigned = 0;
      for (const row of ajustesRows) {
        const v = Math.abs(Number(row.valor || 0));
        const esReverso = /\bREVERSO_DE:\{/.test(
          row.movimiento?.observacion || ''
        );
        ajusteSigned += esReverso ? +v : -v;
      }

      // 4) Saldo actual del pedido ANTES del nuevo recibo
      // saldo = total - abonadoPrevio + ajusteSigned
      const saldoActual = Math.max(
        0,
        totalPedido - abonadoPrevio + ajusteSigned
      );

      // 5) Validar contra lo que se quiere aplicar
      const valorAplicado = Number(p.valorAplicado || 0);
      const ajusteActual = Number(ajustePorPedido.get(pedidoId) || 0);
      const aplicadoTotal = valorAplicado + ajusteActual;

      if (aplicadoTotal - saldoActual > 0.000001) {
        // margen para flotantes
        throw new BadRequestException(
          `El total aplicado (${aplicadoTotal.toLocaleString(
            'es-CO'
          )}) excede el saldo disponible (${saldoActual.toLocaleString(
            'es-CO'
          )}) en el pedido ${pedidoId}.`
        );
      }

      // 6) Saldo luego de aplicar este recibo (abono + ajuste)
      const saldoPost = Math.max(0, saldoActual - aplicadoTotal);

      detalles.push({
        idPedido: pedidoId,
        valorAplicado,
        saldoPendiente: saldoPost,
        estado: saldoPost <= 0 ? 'completo' : 'parcial',
        totalPedido,
        ajusteAplicado: ajusteActual,
      });
    }

    // ---- Transacción: crear recibo, detalles y movimientos ----
    const recibo = await this.prisma.$transaction(async (tx) => {
      // 1) Crear recibo
      const creado = await tx.recibo.create({
        data: {
          clienteId,
          usuarioId: relacion.usuarioId,
          empresaId,
          tipo,
          concepto,
        },
        include: { usuario: true, cliente: true, empresa: true },
      });

      // 2) Detalles + movimiento por ABONO (RECIBO)
      for (const d of detalles) {
        await tx.detalleRecibo.create({
          data: {
            idRecibo: creado.id,
            idPedido: d.idPedido,
            valorTotal: d.valorAplicado,
            estado: d.estado,
            saldoPendiente: d.saldoPendiente,
          },
        });

        if (d.valorAplicado > 0) {
          await tx.movimientosCartera.create({
            data: {
              empresaId,
              idCliente: clienteId,
              idUsuario: relacion.usuarioId,
              idRecibo: creado.id,
              idPedido: d.idPedido,
              valorMovimiento: d.valorAplicado,
              observacion: `Abono generado desde recibo #${creado.id.slice(0, 6)}`,
              tipoMovimientoOrigen: 'RECIBO',
            },
          });
        }
      }

      // 3) Un (1) movimiento AJUSTE_MANUAL por el total de ajustes, con detalle por pedido
      const totalAjuste = detalles.reduce(
        (acc, d) => acc + (d.ajusteAplicado || 0),
        0
      );

      if (totalAjuste > 0) {
        const movAjuste = await tx.movimientosCartera.create({
          data: {
            empresaId,
            idCliente: clienteId,
            idUsuario: relacion.usuarioId,
            idRecibo: creado.id,
            valorMovimiento: totalAjuste, // si prefieres llevarlo solo en detalles, puedes poner 0 aquí
            tipoMovimientoOrigen: 'AJUSTE_MANUAL',
            observacion: `Ajuste (flete/desc) desde recibo #${creado.id.slice(0, 6)}`,
          },
        });

        const detallesAjuste = detalles
          .filter((d) => (d.ajusteAplicado || 0) > 0)
          .map((d) => ({
            idMovimiento: movAjuste.idMovimientoCartera,
            idPedido: d.idPedido,
            valor: d.ajusteAplicado, // positivo: en el cálculo de saldo se interpreta como reducción (no reverso)
          }));

        if (detallesAjuste.length) {
          const { count } = await tx.detalleAjusteCartera.createMany({
            data: detallesAjuste,
          });
          if (count !== detallesAjuste.length) {
            throw new Error(
              'No se pudieron registrar todos los detalles del ajuste'
            );
          }
        }
      }

      return creado;
    });

    // ---- PDF/Envío (asincrónico, no bloquea la respuesta) ----
    setImmediate(() => {
      void (async () => {
        try {
          const cliente = await this.prisma.cliente.findUnique({
            where: { id: clienteId },
            select: {
              nombre: true,
              apellidos: true,
              rasonZocial: true,
              email: true,
            },
          });

          const empresa = await this.prisma.empresa.findUnique({
            where: { id: recibo.empresaId },
            select: {
              nombreComercial: true,
              nit: true,
              direccion: true,
              logoUrl: true,
              telefono: true,
            },
          });

          if (!empresa) throw new Error('no se encontro empresa');

          const resumenRecibo: ResumenReciboDto = {
            id: recibo.id,
            cliente:
              cliente?.rasonZocial ||
              `${cliente?.nombre || ''} ${cliente?.apellidos || ''}`.trim(),
            fecha: recibo.Fechacrecion,
            vendedor: recibo.usuario.nombre,
            tipo: recibo.tipo,
            concepto,
            pedidos: detalles.map((detalle) => ({
              id: detalle.idPedido,
              total: detalle.totalPedido,
              valorAplicado: detalle.valorAplicado,
              saldoPendiente: detalle.saldoPendiente,
            })),
            totalPagado: totalAbonado,
            direccionEmpresa: empresa.direccion,
            logoUrl: empresa.logoUrl,
            nombreEmpresa: empresa.nombreComercial,
            telefonoEmpresa: empresa.telefono,
          };

          const pdfResult =
            await this.pdfUploaderService.generarReciboPDF(resumenRecibo);

          const usuarioDB = await this.prisma.usuario.findUnique({
            where: { id: recibo.usuarioId },
            select: { nombre: true },
          });

          if (!empresa || !usuarioDB) {
            throw new Error('Empresa o usuario no encontrados');
          }

          const folder = `empresas/${recibo.empresaId}/recibos`;
          await this.hetznerStorageService.uploadFile(
            pdfResult.buffer,
            `recibo_${recibo.id}.pdf`,
            folder
          );

          // (correo/whatsapp opcional aquí)
        } catch (err) {
          console.error('❌ Error generando o subiendo PDF de recibo:', err);
        }
      })();
    });

    return {
      mensaje: 'Recibo creado con éxito',
      recibo,
    };
  }

  //obtiene todos los recibos de la bdd ademas de sus detalles abonos y saldo
  async getRecibos(usuario: UsuarioPayload) {
    if (!usuario) throw new UnauthorizedException();

    const { id, empresaId } = usuario;
    const rol = usuario.rol;

    const recibos = await this.prisma.recibo.findMany({
      where: {
        ...(rol === 'admin' //verifica si es rol admin obtiene todos los recibos de la empresa
          ? {
              empresaId: empresaId,
            }
          : {
              empresaId: empresaId,
              usuario: { id: id },
            }),
      },
      include: {
        cliente: {
          select: {
            nombre: true,
            apellidos: true,
            nit: true,
            email: true,
          },
        },
        detalleRecibo: {
          select: {
            valorTotal: true,
            saldoPendiente: true,
            estado: true,
            idPedido: true,
            idRecibo: true,
          },
        },
        usuario: {
          select: {
            nombre: true,
            rol: true,
          },
        },
      },
      orderBy: {
        Fechacrecion: 'desc',
      },
    });
    if (!recibos) return null;

    return recibos;
  }
  //logica para actualizar un recibo y sus relaciones

  async actualizarRecibo(
    id: string,
    data: UpdateReciboDto,
    usuario: UsuarioPayload
  ) {
    if (!usuario) throw new UnauthorizedException('Usuario no autorizado');
    if (usuario.rol !== 'admin') {
      throw new UnauthorizedException(
        'No tienes permiso para editar este recibo'
      );
    }

    const { clienteId, tipo, concepto, pedidos } = data;
    if (!clienteId) throw new UnauthorizedException('Usuario no autorizado');

    const { empresaId } = usuario;

    // 0) Bloqueo si hay reverso registrado contra este recibo
    const hayReverso = await this.existeReversoDeAjusteParaRecibo(
      id,
      empresaId
    );
    if (hayReverso) {
      throw new BadRequestException(
        'Este recibo no se puede editar porque sus ajustes ya fueron reversados en Cartera. ' +
          'Para evitar inconsistencias de saldo, primero elimina el reverso correspondiente o crea un nuevo recibo.'
      );
    }

    // 1) Verifica alcance (y obtiene usuarioId vendedor válido para este cliente)
    const relacion = await this.validarClienteVendedor(clienteId, usuario);

    // 2) Asegura que el recibo exista (y para trazabilidad)
    const recibo = await this.prisma.recibo.findUnique({
      where: { id },
      include: { detalleRecibo: true, cliente: true, usuario: true },
    });
    if (!recibo) throw new NotFoundException('Recibo no encontrado');

    // 3) Si no envían pedidos, solo actualiza encabezado
    if (!Array.isArray(pedidos) || pedidos.length === 0) {
      const reciboActualizado = await this.prisma.recibo.update({
        where: { id },
        data: {
          tipo,
          concepto,
          cliente: { connect: { id: clienteId } },
        },
      });

      this.regenerarPdfReciboEnSegundoPlano(
        id,
        usuario,
        reciboActualizado.Fechacrecion
      );
      return {
        mensaje: 'Recibo actualizado con éxito',
        recibo: reciboActualizado,
      };
    }

    // 4) Normaliza/colapsa pedidos repetidos por si llegan duplicados
    const pedidosColapsados = Object.values(
      pedidos.reduce<
        Record<
          string,
          { pedidoId: string; valorAplicado: number; descuento: number }
        >
      >((acc, p) => {
        const pid = p.pedidoId;
        if (!acc[pid])
          acc[pid] = { pedidoId: pid, valorAplicado: 0, descuento: 0 };
        acc[pid].valorAplicado += Number(p.valorAplicado || 0);
        acc[pid].descuento += Number(p.descuento || 0);
        return acc;
      }, {})
    );

    // 5) Validaciones fuertes por pedido (edición segura: re-asignación)
    type DetalleCalculado = {
      idPedido: string;
      valorAplicado: number;
      descuento: number;
      saldoPendiente: number;
      estado: 'completo' | 'parcial';
      totalPedido: number;
    };

    const detalles: DetalleCalculado[] = [];

    for (const p of pedidosColapsados) {
      const pedidoId = p.pedidoId;
      const valorAplicado = Number(p.valorAplicado || 0);
      const descuento = Number(p.descuento || 0);

      if (valorAplicado < 0 || descuento < 0) {
        throw new BadRequestException(
          'valorAplicado y descuento deben ser ≥ 0.'
        );
      }

      // 5.1) Total del pedido (mismo tenant)
      const pedidoOriginal = await this.prisma.pedido.findUnique({
        where: { id: pedidoId, empresaId },
        select: { id: true, total: true },
      });
      if (!pedidoOriginal) {
        throw new NotFoundException(`Pedido con ID ${pedidoId} no encontrado`);
      }
      const totalPedido = Number(pedidoOriginal.total || 0);

      // 5.2) Abonos TOTALES (incluyendo lo de este recibo)
      const abonadoAggTotal = await this.prisma.detalleRecibo.aggregate({
        _sum: { valorTotal: true },
        where: { idPedido: pedidoId },
      });
      const abonadoTotal = Number(abonadoAggTotal._sum.valorTotal || 0);

      // 5.3) Ajustes TOTALES (incluyendo lo de este recibo), con signo:
      //      - Ajuste normal (AJUSTE_MANUAL): reduce saldo → signo negativo
      //      - Reverso: aumenta saldo → signo positivo (detectado por observación)
      const ajustesRowsTot = await this.prisma.detalleAjusteCartera.findMany({
        where: {
          idPedido: pedidoId,
          movimiento: { empresaId, tipoMovimientoOrigen: 'AJUSTE_MANUAL' },
        },
        select: {
          valor: true,
          movimiento: { select: { observacion: true, idRecibo: true } },
        },
      });

      let ajusteSignedTotal = 0;
      for (const row of ajustesRowsTot) {
        const v = Math.abs(Number(row.valor || 0));
        const esReverso = /\bREVERSO_DE:\{/.test(
          row.movimiento?.observacion || ''
        );
        ajusteSignedTotal += esReverso ? +v : -v;
      }

      // 5.4) Saldo con TODO lo existente actualmente
      const saldoConTodo = Math.max(
        0,
        totalPedido - abonadoTotal + ajusteSignedTotal
      );

      // 5.5) Aportes ANTERIORES de ESTE RECIBO para "liberar" antes de re-asignar
      // Abono previo de este recibo
      const abonadoAnteriorEste = await this.prisma.detalleRecibo.aggregate({
        _sum: { valorTotal: true },
        where: { idPedido: pedidoId, idRecibo: id },
      });
      const abonoAnterior = Number(abonadoAnteriorEste._sum.valorTotal || 0);

      // Ajuste previo de este recibo (si versiones antiguas no ligaban idRecibo, esto dará 0)
      const ajusteAnteriorRows =
        await this.prisma.detalleAjusteCartera.findMany({
          where: {
            idPedido: pedidoId,
            movimiento: {
              empresaId,
              tipoMovimientoOrigen: 'AJUSTE_MANUAL',
              idRecibo: id, // si tienes legado sin idRecibo, puedes añadir una heurística por "observacion"
            },
          },
          select: { valor: true },
        });
      const ajusteAnterior = ajusteAnteriorRows.reduce(
        (s, r) => s + Number(r.valor || 0),
        0
      );

      // 5.6) Saldo disponible para la nueva edición
      const saldoDisponible = saldoConTodo + abonoAnterior + ajusteAnterior;

      // 5.7) Validación dura: (nuevo abono + nuevo descuento) <= saldoDisponible
      const aplicadoTotal = valorAplicado + descuento;
      if (aplicadoTotal - saldoDisponible > 0.000001) {
        throw new BadRequestException(
          `El total aplicado (${aplicadoTotal.toLocaleString('es-CO')}) ` +
            `excede el saldo disponible para reasignar (${saldoDisponible.toLocaleString('es-CO')}) ` +
            `en el pedido ${pedidoId}.`
        );
      }

      // 5.8) Saldo visual post-edición
      const saldoPost = Math.max(
        0,
        saldoConTodo - aplicadoTotal + abonoAnterior + ajusteAnterior
      );

      detalles.push({
        idPedido: pedidoId,
        valorAplicado,
        descuento,
        saldoPendiente: saldoPost,
        estado: saldoPost <= 0 ? 'completo' : 'parcial',
        totalPedido,
      });
    }

    // 6) Transacción: limpiar y reconstruir
    const reciboActualizado = await this.prisma.$transaction(async (tx) => {
      // 6.1) Actualiza encabezado
      const head = await tx.recibo.update({
        where: { id },
        data: {
          tipo,
          concepto,
          cliente: { connect: { id: clienteId } },
        },
      });

      // 6.2) Borrar ajustes previos ligados a ESTE recibo (detalles primero)
      const movsAjustePrev = await tx.movimientosCartera.findMany({
        where: {
          empresaId,
          idRecibo: id,
          tipoMovimientoOrigen: 'AJUSTE_MANUAL',
        },
        select: { idMovimientoCartera: true },
      });
      const movAjIds = movsAjustePrev.map((m) => m.idMovimientoCartera);
      if (movAjIds.length) {
        await tx.detalleAjusteCartera.deleteMany({
          where: { idMovimiento: { in: movAjIds } },
        });
      }

      // 6.3) Borrar detalles y TODOS los movimientos (RECIBO + AJUSTE_MANUAL) de este recibo
      await tx.detalleRecibo.deleteMany({ where: { idRecibo: id } });
      await tx.movimientosCartera.deleteMany({ where: { idRecibo: id } });

      // 6.4) Recrear detalles y movimiento RECIBO por cada pedido
      for (const d of detalles) {
        await tx.detalleRecibo.create({
          data: {
            idRecibo: id,
            idPedido: d.idPedido,
            valorTotal: d.valorAplicado,
            estado: d.estado,
            saldoPendiente: d.saldoPendiente,
          },
        });

        if (d.valorAplicado > 0) {
          await tx.movimientosCartera.create({
            data: {
              empresaId,
              idCliente: clienteId,
              idUsuario: relacion.usuarioId,
              idRecibo: id,
              idPedido: d.idPedido, // opcional, trazabilidad
              valorMovimiento: d.valorAplicado,
              observacion: `Abono actualizado para recibo #${id.slice(0, 6)}`,
              tipoMovimientoOrigen: 'RECIBO',
            },
          });
        }
      }

      // 6.5) Crear 1 movimiento AJUSTE_MANUAL consolidado (si hay descuentos > 0)
      const totalDescuento = detalles.reduce(
        (s, d) => s + (d.descuento || 0),
        0
      );
      if (totalDescuento > 0) {
        const movAjuste = await tx.movimientosCartera.create({
          data: {
            empresaId,
            idCliente: clienteId,
            idUsuario: relacion.usuarioId,
            idRecibo: id,
            valorMovimiento: totalDescuento,
            tipoMovimientoOrigen: 'AJUSTE_MANUAL',
            observacion: `Ajuste manual (descuentos) para recibo #${id.slice(0, 6)}`,
          },
          select: { idMovimientoCartera: true },
        });

        const detallesAj = detalles
          .filter((d) => (d.descuento || 0) > 0)
          .map((d) => ({
            idMovimiento: movAjuste.idMovimientoCartera,
            idPedido: d.idPedido,
            valor: d.descuento, // positivo => reduce saldo
          }));

        if (detallesAj.length) {
          const { count } = await tx.detalleAjusteCartera.createMany({
            data: detallesAj,
          });
          if (count !== detallesAj.length) {
            throw new Error(
              'No se pudieron registrar todos los detalles del ajuste'
            );
          }
        }
      }

      return head;
    });

    // 7) Regenerar PDF en segundo plano
    this.regenerarPdfReciboEnSegundoPlano(
      id,
      usuario,
      reciboActualizado.Fechacrecion
    );

    return {
      mensaje: 'Recibo actualizado con éxito',
      recibo: reciboActualizado,
    };
  }

  /**
   * Regenera y sube el PDF del recibo de forma asíncrona, sin bloquear la respuesta.
   */
  private regenerarPdfReciboEnSegundoPlano(
    idRecibo: string,
    usuario: UsuarioPayload,
    fechaCreacion: Date
  ) {
    setImmediate(() => {
      void (async () => {
        try {
          // Datos del recibo recalculados
          const detallesActualizados = await this.prisma.detalleRecibo.findMany(
            {
              where: { idRecibo },
              include: { pedido: true },
            }
          );

          const rec = await this.prisma.recibo.findUnique({
            where: { id: idRecibo },
            include: { cliente: true },
          });

          const empresa = await this.prisma.empresa.findUnique({
            where: { id: usuario.empresaId },
            select: {
              nit: true,
              nombreComercial: true,
              direccion: true,
              telefono: true,
              logoUrl: true,
            },
          });

          if (!rec || !empresa) throw new Error('Datos incompletos');

          const resumen: ResumenReciboDto = {
            id: idRecibo,
            cliente:
              rec.cliente?.rasonZocial ||
              `${rec.cliente?.nombre || ''} ${rec.cliente?.apellidos || ''}`.trim(),
            fecha: fechaCreacion,
            vendedor: usuario.nombre,
            tipo: rec.tipo,
            concepto: rec.concepto,
            pedidos: detallesActualizados.map((d) => ({
              id: d.idPedido,
              total: d.pedido?.total ?? 0,
              valorAplicado: d.valorTotal,
              saldoPendiente: d.saldoPendiente ?? 0,
            })),
            totalPagado: detallesActualizados.reduce(
              (sum, d) => sum + d.valorTotal,
              0
            ),
            direccionEmpresa: empresa.direccion,
            logoUrl: empresa.logoUrl,
            nombreEmpresa: empresa.nombreComercial,
            telefonoEmpresa: empresa.telefono,
          };

          const pdfBuffer =
            await this.pdfUploaderService.generarReciboPDF(resumen);

          const folder = `empresas/${rec.empresaId}/recibos`;
          await this.hetznerStorageService.uploadFile(
            pdfBuffer.buffer,
            `recibo_${idRecibo}.pdf`,
            folder
          );

          // (Opcional) envío por correo reutilizando tu servicio de correo…
        } catch (err) {
          console.error('❌ Error al regenerar PDF actualizado:', err);
        }
      })();
    });
  }

  async marcarRevisado(usuario: UsuarioPayload, id: string) {
    const { empresaId, id: usuarioId } = usuario;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1) Trae el estado actual + concepto
      const current = await tx.recibo.findFirst({
        where: { id, empresaId },
        select: { revisado: true, concepto: true },
      });
      if (!current) throw new BadRequestException('Recibo no encontrado');

      // 2) Preparar auditoría
      const actor = await tx.usuario.findUnique({
        where: { id: usuarioId },
        select: { nombre: true, apellidos: true },
      });
      const actorNombre =
        `${actor?.nombre ?? 'Usuario'} ${actor?.apellidos ?? ''}`.trim();

      const marca = new Date().toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        hour12: false,
        dateStyle: 'short',
        timeStyle: 'short',
      });

      const nuevoValor = !current.revisado; // toggle
      const linea = `[${marca}] ${nuevoValor ? 'Marcado REVISADO' : 'Marcado PENDIENTE'} por ${actorNombre}`;

      // 3) Construir concepto final (append, con una línea en blanco)
      const base = current.concepto ?? '';
      const baseLimpia = base.replace(/\s+$/, ''); // no borres saltos iniciales
      const conceptoFinal = baseLimpia ? `${baseLimpia}\n\n${linea}` : linea;

      // 4) Un único update que cambia ambos campos
      const updated = await tx.recibo.update({
        where: { id }, // id es PK; empresaId ya se validó arriba
        data: { revisado: nuevoValor, concepto: conceptoFinal },
        select: { revisado: true },
      });

      return updated.revisado; // devolvemos boolean
    });

    return result;
  }

  //   export type ReciboResumen = {
  //   id: string;
  //   fecha: string;
  //   cliente?: ClienteLite | null;
  //   pedidos?: { id: string; numero?: string | null; valor?: number | null }[];
  //   valorTotal?: number | null;
  //   observaciones?: string | null;
  // };

  //logica para obtener acceso a un recibo por su id
  async getReciboPorId(id: string, usuario: UsuarioPayload) {
    if (!usuario) throw new UnauthorizedException('Usuario no autorizado');
    const { empresaId } = usuario;

    const recibo = await this.prisma.recibo.findUnique({
      where: { empresaId, id },
      include: {
        cliente: true,
        detalleRecibo: true,
        //usuario: true,
      },
    });

    if (!recibo) {
      throw new NotFoundException('Recibo no encontrado');
    }

    return recibo;
  }

  async getRecaudosPorRango(
    from: Date,
    to: Date,
    nombreVendedor: string,
    userId: string
  ) {
    const usuarioEmpresa = await this.prisma.usuario.findUnique({
      where: { codigo: userId },
      select: {
        empresaId: true,
      },
    });
    const recibos = await this.prisma.recibo.findMany({
      where: {
        Fechacrecion: {
          gte: from,
          lte: to,
        },
        usuario:
          nombreVendedor !== 'todos'
            ? {
                nombre: nombreVendedor, // Filtra por el nombre del vendedor específico
                empresa: {
                  id: usuarioEmpresa?.empresaId, // Filtra por la empresa relacionada con el vendedor
                },
              }
            : {
                // Si el vendedor es "todos", solo se filtra por empresa
                empresaId: usuarioEmpresa?.empresaId,
              },
      },
      select: {
        id: true,
        tipo: true,
        Fechacrecion: true,
        concepto: true,
        //valor: true,
        cliente: {
          select: {
            nombre: true,
            apellidos: true,
          },
        },
        usuario: {
          select: {
            nombre: true,
          },
        },
      },
    });

    return recibos;
  }
  /////// no se usara delete
  async eliminarRecibo(id: string) {
    // Verificar si el recibo existe
    const recibo = await this.prisma.recibo.findUnique({
      where: { id },
    });

    if (!recibo) {
      throw new NotFoundException('Recibo no encontrado');
    }

    // Eliminar el recibo
    await this.prisma.recibo.delete({
      where: { id },
    });

    return { mensaje: 'Recibo eliminado correctamente', id };
  }

  // obtener estadísticas para el header de recibos (con AJUSTE_MANUAL)
  async getResumen(usuario: UsuarioPayload) {
    const { empresaId, id: userId, rol } = usuario;

    // Alcance por rol
    const scopePedido =
      rol === 'admin' ? { empresaId } : { empresaId, usuarioId: userId };

    const scopeRecibo =
      rol === 'admin' ? { empresaId } : { empresaId, usuarioId: userId };

    const scopeAjusteMovimiento =
      rol === 'admin' ? { empresaId } : { empresaId, idUsuario: userId };

    // 1) Totales base
    const totalRecibos = await this.prisma.recibo.count({
      where: scopeRecibo,
    });

    const totalRecaudadoAggr = await this.prisma.detalleRecibo.aggregate({
      where: {
        recibo: scopeRecibo, // Recibo.empresaId y (opcional) Recibo.usuarioId
      },
      _sum: { valorTotal: true },
    });
    const totalRecaudado = Number(totalRecaudadoAggr._sum.valorTotal || 0);

    // 2) Pedidos FACTURADOS con total > 0
    const pedidos = await this.prisma.pedido.findMany({
      where: {
        ...scopePedido,
        total: { gt: 0 },
        estados: { some: { estado: 'FACTURADO' } },
      },
      select: {
        id: true,
        total: true,
        detalleRecibo: { select: { valorTotal: true } }, // abonos efectivos
      },
      orderBy: { fechaPedido: 'asc' },
    });

    // 3) AJUSTES_MANUALES POR PEDIDO (DetalleAjusteCartera.idPedido != null)
    //    Se agrupan por pedido SOLO si el movimiento origen es AJUSTE_MANUAL
    const ajustesPorPedido = await this.prisma.detalleAjusteCartera.groupBy({
      by: ['idPedido'],
      where: {
        idPedido: { not: null },
        movimiento: {
          ...scopeAjusteMovimiento, // empresaId (+ idUsuario si no es admin)
          tipoMovimientoOrigen: 'AJUSTE_MANUAL', // enum OrigenMovimientoEnum
        },
      },
      _sum: { valor: true },
    });

    // Mapa: cada ajuste es NEGATIVO (siempre reduce cartera)
    const mapaAjustePorPedido = new Map<string, number>();
    for (const row of ajustesPorPedido) {
      if (!row.idPedido) continue;
      const firmado = -Math.abs(Number(row._sum.valor || 0));
      mapaAjustePorPedido.set(row.idPedido, firmado);
    }

    // 4) Saldo por pedido = total - abonos + ajustes(negativos)  (clamp por pedido >= 0)
    const totalPorRecaudarBruto = pedidos.reduce((acc, p) => {
      const abonado = p.detalleRecibo.reduce(
        (s, d) => s + Number(d.valorTotal || 0),
        0
      );
      const ajusteNeg = mapaAjustePorPedido.get(p.id) ?? 0; // ya es <= 0
      const saldo = Math.max(0, Number(p.total || 0) - abonado + ajusteNeg);
      return acc + saldo;
    }, 0);

    // 5) AJUSTES_MANUALES GLOBALES (DetalleAjusteCartera.idPedido == null)
    const ajustesGlobalesAggr =
      await this.prisma.detalleAjusteCartera.aggregate({
        where: {
          idPedido: null,
          movimiento: {
            ...scopeAjusteMovimiento, // empresaId (+ idUsuario si no es admin)
            tipoMovimientoOrigen: 'AJUSTE_MANUAL',
          },
        },
        _sum: { valor: true },
      });
    // También NEGATIVO (reduce cartera)
    const netoAjustesGlobales = -Math.abs(
      Number(ajustesGlobalesAggr._sum.valor || 0)
    );

    // 6) Total final por recaudar (clamp global >= 0)
    const totalPorRecaudar = Math.max(
      0,
      totalPorRecaudarBruto + netoAjustesGlobales
    );

    return {
      totalRecibos,
      totalRecaudado,
      totalPorRecaudar,
    };
  }

  async obtenerPedidosConSaldoPorCliente(
    clienteId: string,
    usuario: UsuarioPayload
  ) {
    const { empresaId } = usuario;

    // 1. Traer pedidos con estados y recibos
    const pedidos = await this.prisma.pedido.findMany({
      where: {
        clienteId,
        empresaId,
      },
      include: {
        detalleRecibo: true,
        estados: true,
      },
      orderBy: {
        fechaPedido: 'asc',
      },
    });

    // 2. Filtrar los que están en estado FACTURADO o ENVIADO (último estado)
    const pedidosValidos = pedidos.filter((pedido) => {
      const estadoMasReciente = [...pedido.estados].sort(
        (a, b) => b.fechaEstado.getTime() - a.fechaEstado.getTime()
      )[0];

      return (
        estadoMasReciente &&
        (estadoMasReciente.estado === 'FACTURADO' ||
          estadoMasReciente.estado === 'ENVIADO')
      );
    });

    // 3. Traer ajustes manuales
    const detallesAjuste = await this.prisma.detalleAjusteCartera.findMany({
      where: {
        pedido: {
          clienteId,
          empresaId,
        },
        movimiento: {
          tipoMovimientoOrigen: 'AJUSTE_MANUAL',
          idCliente: clienteId,
          empresaId,
        },
      },
      select: {
        idPedido: true,
        valor: true,
      },
    });

    // 4. Agrupar ajustes por pedidoId
    const ajustesPorPedido = detallesAjuste.reduce(
      (acc, ajuste) => {
        if (!ajuste.idPedido) return acc;
        if (!acc[ajuste.idPedido]) acc[ajuste.idPedido] = 0;
        acc[ajuste.idPedido] += ajuste.valor;
        return acc;
      },
      {} as Record<string, number>
    );

    // 5. Calcular saldo pendiente por pedido válido
    const pedidosConSaldo = pedidosValidos
      .map((pedido) => {
        const totalAbonado = pedido.detalleRecibo.reduce(
          (suma, d) => suma + d.valorTotal,
          0
        );

        const ajusteManual = ajustesPorPedido[pedido.id] || 0;

        const saldoPendiente = pedido.total - totalAbonado - ajusteManual;
        const flete = pedido.flete || 0;

        return saldoPendiente > 0
          ? {
              id: pedido.id,
              fecha: pedido.fechaPedido,
              saldoPendiente,
              valorOriginal: pedido.total,
              flete,
            }
          : null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    return pedidosConSaldo;
  }

  // recibos.service.ts
  async getAjustesPorRecibo(reciboId: string, usuario: UsuarioPayload) {
    if (!usuario) throw new UnauthorizedException();
    const { empresaId } = usuario;

    // Busca todos los movimientos de ajuste ligados al recibo (por si en el futuro hay más de uno)

    const movs = await this.prisma.movimientosCartera.findMany({
      where: {
        idRecibo: reciboId,
        empresaId: empresaId,
        tipoMovimientoOrigen: 'AJUSTE_MANUAL',
      },
      select: { idMovimientoCartera: true },
    });

    if (!movs.length) return [];

    const movIds = movs.map((m) => m.idMovimientoCartera);

    const detalles = await this.prisma.detalleAjusteCartera.findMany({
      where: { idMovimiento: { in: movIds } },
      select: { idPedido: true, valor: true },
    });

    // Agrupa por pedido
    const map = new Map<string, number>();
    for (const d of detalles) {
      const k = d.idPedido!;
      map.set(k, (map.get(k) ?? 0) + Number(d.valor || 0));
    }

    // Devuelve [{ idPedido, ajuste }]

    return Array.from(map, ([idPedido, ajuste]) => ({ idPedido, ajuste }));
  }

  async exportarRecibosExcel(body: ExportRecaudosDto, usuario: UsuarioPayload) {
    if (!usuario) throw new UnauthorizedException('Usuario no autenticado');

    const { empresaId, id: vendedorId } = usuario;
    if (!empresaId) {
      throw new BadRequestException('empresaId requerido');
    }

    const { fechaInicio, fechaFin } = body;

    if (!fechaInicio || !fechaFin) {
      throw new BadRequestException(
        'fechaInicio y fechaFin son obligatorias para exportar recaudos'
      );
    }

    // ✅ Normalizar fechas al día completo (mismo helper que ya usas)
    const { inicio, fin } = this.normalizarRango(fechaInicio, fechaFin);

    // ✅ Traer recibos del vendedor logueado, en el rango
    const recibos = await this.prisma.recibo.findMany({
      where: {
        empresaId,
        Fechacrecion: { gte: inicio, lte: fin },
        usuarioId: vendedorId, // 👈 vendedor = usuario logueado
      },
      include: {
        detalleRecibo: {
          select: {
            valorTotal: true,
            pedido: {
              select: {
                comisionVendedor: true,
              },
            },
          },
        },
        usuario: { select: { nombre: true, apellidos: true } },
        cliente: {
          select: { nombre: true, apellidos: true, rasonZocial: true },
        },
      },
    });

    // ✅ Mapeo idéntico al de reporteRecaudoVendedor
    const rows = recibos.map((r) => {
      const totalRecaudo = r.detalleRecibo.reduce(
        (s, d) => s + Number(d.valorTotal || 0),
        0
      );

      const comisionLiquidada = r.detalleRecibo.reduce((s, d) => {
        const pct = d.pedido?.comisionVendedor ?? 0;
        return s + (Number(d.valorTotal || 0) * pct) / 100;
      }, 0);

      return {
        reciboId: r.id.slice(0, 5),
        fecha: r.Fechacrecion,
        tipo: r.tipo,
        cliente: `${r.cliente.nombre} ${r.cliente.apellidos}`.trim(),
        rasonZocial: r.cliente.rasonZocial,
        valor: totalRecaudo,
        vendedor: `${r.usuario.nombre} ${r.usuario.apellidos}`.trim(),
        concepto: r.concepto,
        estado: r.revisado ? 'revisado' : 'pendiente',
        comisionLiquidada,
      };
    });

    // 👉 Si no quieres generar Excel aquí y ya tienes un servicio genérico,
    // podrías hacer simplemente:
    // return this.excelService.generarExcelRecaudos(rows);

    // ✅ Generar Excel directamente con exceljs
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Recaudos');

    // Encabezados
    sheet.columns = [
      { header: 'ID Recibo', key: 'reciboId', width: 12 },
      { header: 'Fecha', key: 'fecha', width: 16 },
      { header: 'Tipo', key: 'tipo', width: 12 },
      { header: 'Cliente', key: 'cliente', width: 32 },
      { header: 'Razón Social', key: 'rasonZocial', width: 32 },
      { header: 'Valor Recaudo', key: 'valor', width: 16 },
      { header: 'Vendedor', key: 'vendedor', width: 24 },
      { header: 'Concepto', key: 'concepto', width: 32 },
      { header: 'Estado', key: 'estado', width: 12 },
      { header: 'Comisión Liquidada', key: 'comisionLiquidada', width: 18 },
    ];

    // Filita por cada recibo
    rows.forEach((r) => {
      sheet.addRow({
        ...r,
        fecha: r.fecha ? new Date(r.fecha) : null,
      });
    });

    // Formato de fecha y moneda rápido
    sheet.getColumn('fecha').numFmt = 'yyyy-mm-dd';
    sheet.getColumn('valor').numFmt = '#,##0.00';
    sheet.getColumn('comisionLiquidada').numFmt = '#,##0.00';

    // Encabezado en negrita
    sheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
}
