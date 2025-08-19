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
  private async validarSaldoPedido(pedidoId: string, valorAplicado: number) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { detalleRecibo: true },
    });

    if (!pedido) {
      throw new Error(`Pedido con ID ${pedidoId} no encontrado`);
    }

    const totalAbonado = pedido.detalleRecibo.reduce(
      (sum, r) => sum + r.valorTotal,
      0
    );

    const saldo = pedido.total - totalAbonado;

    if (saldo <= 0) {
      throw new Error(`El pedido ${pedidoId} ya fue abonado completamente.`);
    }

    if (valorAplicado > saldo) {
      throw new Error(
        `El valor aplicado (${valorAplicado}) supera el saldo restante (${saldo}) del pedido ${pedidoId}.`
      );
    }

    return { saldoRestante: saldo };
  }

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

  //crea un recibo y registra en detalle recibo y los movimientos te cartera correspondiente
  async crearRecibo(data: CrearReciboDto, usuario: UsuarioPayload) {
    if (!usuario) {
      throw new UnauthorizedException('Usuario no autorizado');
    }

    const { clienteId, tipo, concepto, pedidos } = data;
    const relacion = await this.validarClienteVendedor(clienteId, usuario);

    if (!pedidos || pedidos.length === 0) {
      throw new BadRequestException(
        'Debe asociar al menos un pedido al recibo.'
      );
    }

    const totalAbonado = pedidos.reduce((sum, p) => sum + p.valorAplicado, 0);
    if (totalAbonado <= 0) {
      throw new BadRequestException('El total aplicado debe ser mayor a 0.');
    }

    const detalles: {
      idPedido: string;
      valorAplicado: number;
      saldoPendiente: number;
      estado: string;
      totalPedido: number;
    }[] = [];

    for (const pedido of pedidos) {
      const pedidoOriginal = await this.prisma.pedido.findUnique({
        where: { id: pedido.pedidoId },
        include: { detalleRecibo: true },
      });

      if (!pedidoOriginal) {
        throw new NotFoundException(
          `Pedido con ID ${pedido.pedidoId} no encontrado`
        );
      }

      const totalAbonadoAnterior = pedidoOriginal.detalleRecibo.reduce(
        (sum, r) => sum + r.valorTotal,
        0
      );

      const saldoRestante = pedidoOriginal.total - totalAbonadoAnterior;
      const nuevoSaldo = saldoRestante - pedido.valorAplicado;

      if (pedido.valorAplicado > saldoRestante) {
        throw new BadRequestException(
          `El valor aplicado (${pedido.valorAplicado}) supera el saldo pendiente (${saldoRestante}) para el pedido ${pedido.pedidoId}`
        );
      }

      detalles.push({
        idPedido: pedido.pedidoId,
        valorAplicado: pedido.valorAplicado,
        saldoPendiente: Math.max(nuevoSaldo, 0),
        estado: nuevoSaldo <= 0 ? 'completo' : 'parcial',
        totalPedido: pedidoOriginal.total,
      });
    }

    const recibo = await this.prisma.$transaction(async (tx) => {
      const creado = await tx.recibo.create({
        data: {
          clienteId,
          usuarioId: relacion.usuarioId,
          empresaId: usuario.empresaId,
          tipo,
          concepto,
        },
        include: { usuario: true, cliente: true, empresa: true },
      });

      for (const detalle of detalles) {
        await tx.detalleRecibo.create({
          data: {
            idRecibo: creado.id,
            idPedido: detalle.idPedido,
            valorTotal: detalle.valorAplicado,
            estado: detalle.estado,
            saldoPendiente: detalle.saldoPendiente,
          },
          include: { pedido: true },
        });

        await tx.movimientosCartera.create({
          data: {
            idCliente: clienteId,
            valorMovimiento: detalle.valorAplicado,
            idUsuario: relacion.usuarioId,
            empresaId: usuario.empresaId,
            idRecibo: creado.id,
            observacion: `Abono generado desde creación de recibo #${creado.id}`,
            tipoMovimientoOrigen: 'RECIBO',
          },
        });
      }

      return creado;
    });

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

          //process.stdout.write('🔍 logo URL: ' + empresa.logoUrl + '\n');

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

          const url = await this.hetznerStorageService.uploadFile(
            pdfResult.buffer,
            `recibo_${recibo.id}.pdf`,
            folder
          );

          // const { url: publicUrl } = await this.cloudinaryService.uploadPdf({
          //   buffer: pdfResult.buffer,
          //   fileName: `recibo_${recibo.id}.pdf`,
          //   empresaNit: empresa.nit,
          //   empresaNombre: empresa.nombreComercial,
          //   usuarioNombre: usuarioDB.nombre,
          //   tipo: 'recibos',
          // });

          if (!recibo.cliente?.email) throw new Error('Error al obtener email');

          const numeroWhatsApp = `+57${recibo.usuario?.telefono?.replace(/\D/g, '')}`;

          await this.resendService.enviarCorreo(
            recibo.cliente.email,
            'Confirmación de tu recibo',
            `
  <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
    <p>Hola <strong>${recibo.cliente.nombre}</strong>,</p>

    <p>Tu Recibo ha sido <strong>Generado exitosamente</strong>. Adjuntamos el comprobante en PDF:</p>

    <p style="margin: 16px 0;">
      <a href="${url}" target="_blank"
         style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
        Ver Comprobante PDF
      </a>
    </p>

    <p>¿Tienes alguna duda sobre tu pago? Contáctanos:</p>

    <p>
      <a href="https://wa.me/${numeroWhatsApp}" target="_blank"
         style="display: inline-block; padding: 8px 16px; background-color: #25D366; color: white; text-decoration: none; border-radius: 6px;">
        💬 Contactar por WhatsApp
      </a>
    </p>

    <p style="margin-top: 30px;">Gracias por tu pago,</p>
    <p><strong>Equipo de Recaudos</strong></p>
  </div>
  `
          );
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

    const { clienteId } = data;
    if (!clienteId) throw new UnauthorizedException('Usuario no autorizado');
    const relacion = await this.validarClienteVendedor(clienteId, usuario);

    const recibo = await this.prisma.recibo.findUnique({
      where: { id },
      include: { detalleRecibo: true, cliente: true, usuario: true },
    });

    if (!recibo) throw new NotFoundException('Recibo no encontrado');
    if (usuario.rol !== 'admin') {
      throw new UnauthorizedException(
        'No tienes permiso para editar este recibo'
      );
    }

    if (data.pedidos) {
      for (const pedido of data.pedidos) {
        const anterior = recibo.detalleRecibo.find(
          (d) => d.idPedido === pedido.pedidoId
        );
        const valorPrevio = anterior?.valorTotal || 0;
        const diferencia = pedido.valorAplicado - valorPrevio;
        if (diferencia > 0) {
          await this.validarSaldoPedido(pedido.pedidoId, diferencia);
        }
      }
    }

    const reciboActualizado = await this.prisma.recibo.update({
      where: { id },
      data: {
        tipo: data.tipo,
        concepto: data.concepto,
        cliente: { connect: { id: clienteId } },
      },
    });

    // Eliminar detalleRecibo y movimientosCartera anteriores
    await this.prisma.detalleRecibo.deleteMany({ where: { idRecibo: id } });
    await this.prisma.movimientosCartera.deleteMany({
      where: { idRecibo: id },
    });

    if (data.pedidos) {
      for (const pedido of data.pedidos) {
        const { saldoRestante } = await this.validarSaldoPedido(
          pedido.pedidoId,
          pedido.valorAplicado
        );
        const nuevoSaldo = saldoRestante - pedido.valorAplicado;

        await this.prisma.detalleRecibo.create({
          data: {
            idRecibo: recibo.id,
            idPedido: pedido.pedidoId,
            valorTotal: pedido.valorAplicado,
            estado: nuevoSaldo <= 0 ? 'completo' : 'parcial',
            saldoPendiente: Math.max(nuevoSaldo, 0),
          },
        });

        await this.prisma.movimientosCartera.create({
          data: {
            idCliente: clienteId,
            valorMovimiento: pedido.valorAplicado,
            idUsuario: relacion.usuarioId,
            empresaId: usuario.empresaId,
            idRecibo: recibo.id,
            observacion: `Abono actualizado para recibo #${recibo.id}`,
            tipoMovimientoOrigen: 'RECIBO',
          },
        });
      }
    }

    // Generar y subir nuevo PDF en segundo plano
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

          const detallesActualizados = await this.prisma.detalleRecibo.findMany(
            {
              where: { idRecibo: id },
              include: { pedido: true },
            }
          );

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

          if (!empresa) throw new Error('no se encontro empresa');

          const resumen: ResumenReciboDto = {
            id,
            cliente:
              cliente?.rasonZocial ||
              `${cliente?.nombre || ''} ${cliente?.apellidos || ''}`.trim(),
            fecha: reciboActualizado.Fechacrecion,
            vendedor: usuario.nombre,
            tipo: reciboActualizado.tipo,
            concepto: reciboActualizado.concepto,
            pedidos: detallesActualizados.map((detalle) => ({
              id: detalle.idPedido,
              total: detalle.pedido?.total ?? 0,
              valorAplicado: detalle.valorTotal,
              saldoPendiente: detalle.saldoPendiente ?? 0,
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

          const usuarioDb = await this.prisma.usuario.findUnique({
            where: { id: usuario.id },
            select: { nombre: true },
          });

          if (!empresa || !usuarioDb) throw new Error('Datos incompletos');

          const folder = `empresas/${recibo.empresaId}/recibos`;

          const url = await this.hetznerStorageService.uploadFile(
            pdfBuffer.buffer,
            `recibo_${recibo.id}.pdf`,
            folder
          );

          // await this.cloudinaryService.uploadPdf({
          //   buffer: pdfBuffer.buffer,
          //   fileName: `recibo_${id}.pdf`,
          //   empresaNit: empresa.nit,
          //   empresaNombre: empresa.nombreComercial,
          //   usuarioNombre: usuarioDb.nombre,
          //   tipo: 'recibos',
          // });

          if (!recibo.cliente?.email) throw new Error('Error al obtener email');

          const numeroWhatsApp = `+57${recibo.usuario?.telefono?.replace(/\D/g, '')}`;
          await this.resendService.enviarCorreo(
            recibo.cliente.email,
            'Actualizacion de tu recibo',
            `
  <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
    <p>Hola <strong>${recibo.cliente.nombre}</strong>,</p>

    <p>Tu Recibo ha sido <strong>Generado exitosamente</strong>. Adjuntamos el comprobante en PDF:</p>

    <p style="margin: 16px 0;">
      <a href="${url}" target="_blank"
         style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
        Ver Comprobante PDF
      </a>
    </p>

    <p>¿Tienes alguna duda sobre tu pago? Contáctanos:</p>

    <p>
      <a href="https://wa.me/${numeroWhatsApp}" target="_blank"
         style="display: inline-block; padding: 8px 16px; background-color: #25D366; color: white; text-decoration: none; border-radius: 6px;">
        💬 Contactar por WhatsApp
      </a>
    </p>

    <p style="margin-top: 30px;">Gracias por tu pago,</p>
    <p><strong>Equipo de Recaudos</strong></p>
  </div>
  `
          );
        } catch (err) {
          console.error('❌ Error al regenerar PDF actualizado:', err);
        }
      })();
    });

    return {
      mensaje: 'Recibo actualizado con éxito',
      recibo: reciboActualizado,
    };
  }

  //marcar recibo como revisado
  async marcarRevisado(usuario: UsuarioPayload, id: string) {
    const { empresaId } = usuario;
    const result = await this.prisma.$transaction(async (tx) => {
      const current = await tx.recibo.findFirst({
        where: { id, empresaId },
        select: { revisado: true },
      });
      if (!current) throw new BadRequestException('Recibo no encontrado');

      const updated = await tx.recibo.update({
        where: { id }, // id es PK; empresaId se validó arriba
        data: { revisado: !current.revisado },
        select: { revisado: true },
      });
      return updated.revisado; // 👈 devolvemos boolean
    });

    return result; // 👈 devolvemos el boolean al controller
  }

  //logica para obtener acceso a un recibo por su id
  async getReciboPorId(id: string, usuario: UsuarioPayload) {
    if (!usuario) throw new UnauthorizedException('Usuario no autorizado');
    const { empresaId } = usuario;

    const recibo = await this.prisma.recibo.findUnique({
      where: { empresaId, id },
      include: {
        cliente: true,
        detalleRecibo: true,
        usuario: true,
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

  //obtener estadisticas para el header de recibos
  async getResumen(usuario: UsuarioPayload) {
    const { empresaId, id: userId, rol } = usuario;

    const totalRecibos = await this.prisma.recibo.count({
      where: rol === 'admin' ? { empresaId } : { empresaId, usuarioId: userId },
    });

    const totalRecaudado = await this.prisma.detalleRecibo.aggregate({
      where: {
        recibo: {
          empresaId,
          ...(rol !== 'admin' && { usuarioId: userId }),
        },
      },
      _sum: { valorTotal: true },
    });

    // 🚩 Solo pedidos FACTURADOS y con total > 0
    const pedidos = await this.prisma.pedido.findMany({
      where: {
        empresaId,
        ...(rol !== 'admin' && { usuarioId: userId }),
        total: { gt: 0 },
        estados: { some: { estado: 'FACTURADO' } },
      },
      select: {
        total: true,
        detalleRecibo: { select: { valorTotal: true } },
      },
      orderBy: { fechaPedido: 'asc' },
    });

    const totalPorRecaudar = pedidos.reduce((acc, p) => {
      const abonado = p.detalleRecibo.reduce(
        (s, d) => s + Number(d.valorTotal || 0),
        0
      );
      const saldo = Math.max(0, Number(p.total || 0) - abonado); // clamp >= 0
      return acc + saldo;
    }, 0);

    return {
      totalRecibos,
      totalRecaudado: totalRecaudado._sum.valorTotal || 0,
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

        return saldoPendiente > 0
          ? {
              id: pedido.id,
              fecha: pedido.fechaPedido,
              saldoPendiente,
              valorOriginal: pedido.total,
            }
          : null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    return pedidosConSaldo;
  }
}
