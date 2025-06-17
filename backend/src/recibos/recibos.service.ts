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

import * as fs from 'fs';
import { unlink, writeFile } from 'fs/promises';
import * as path from 'path';
import { PdfUploaderService } from 'src/pdf-uploader/pdf-uploader.service';
import { ResumenReciboDto } from 'src/pdf-uploader/dto/resumen-recibo.dto';
import { GoogleDriveService } from 'src/google-drive/google-drive.service';
@Injectable()
export class RecibosService {
  constructor(
    private prisma: PrismaService,
    private pdfUploaderService: PdfUploaderService,
    private googleDriveService: GoogleDriveService,
    private resendService: ResendService
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
    await this.validarClienteVendedor(clienteId, usuario);

    const inicio = Date.now();

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
      });
    }

    const recibo = await this.prisma.$transaction(async (tx) => {
      const creado = await tx.recibo.create({
        data: {
          clienteId,
          usuarioId: usuario.id,
          empresaId: usuario.empresaId,
          tipo,
          concepto,
        },
        include: { usuario: true },
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
        });

        await tx.movimientosCartera.create({
          data: {
            idCliente: clienteId,
            valorMovimiento: detalle.valorAplicado,
            idUsuario: usuario.id,
            empresaId: usuario.empresaId,
            idPedido: detalle.idPedido,
            idRecibo: creado.id,
            observacion: `Abono generado desde creación de recibo #${creado.id}`,
          },
        });
      }

      return creado;
    });

    console.log(`📤 Recibo creado en ${Date.now() - inicio}ms`);

    // PDF en segundo plano
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
              total: 0,
              valorAplicado: detalle.valorAplicado,
              saldoPendiente: detalle.saldoPendiente,
            })),
            totalPagado: totalAbonado,
          };

          const pdfBuffer =
            await this.pdfUploaderService.generarReciboPDF(resumenRecibo);

          // Paso 1: Obtener empresa y usuario
          const empresa = await this.prisma.empresa.findUnique({
            where: { id: recibo.empresaId },
            select: { nombreComercial: true, nit: true },
          });

          const usuario = await this.prisma.usuario.findUnique({
            where: { id: recibo.usuarioId },
            select: { nombre: true },
          });

          if (!empresa || !usuario) {
            throw new Error('Empresa o usuario no encontrados');
          }

          // Paso 2: Construir ruta jerárquica
          const empresaFolderName = `${empresa.nit}-${empresa.nombreComercial}`;
          const folderPath = [empresaFolderName, usuario.nombre, 'recibos'];
          const rootFolderId = this.googleDriveService.EMPRESAS_FOLDER_ID;
          if (!rootFolderId) {
            throw new Error('GOOGLE_DRIVE_EMPRESAS_FOLDER_ID no está definida');
          }
          // Paso 3: Buscar carpeta destino en Drive
          const folderId = await this.googleDriveService.findFolderByPath(
            folderPath,
            rootFolderId
          );

          if (!folderId)
            throw new Error('No se encontró carpeta destino en Drive');

          // Paso 4: Subir PDF a Drive
          const publicUrl = await this.googleDriveService.uploadPdf({
            name: `recibo_${recibo.id}_${cliente?.nombre || 'cliente'}.pdf`,
            buffer: pdfBuffer.buffer,
            folderId,
          });
          if (!cliente?.email) throw new Error('error al obtener email');
          const emailSend = await this.resendService.enviarCorreo(
            cliente?.email,
            'Recibo de pago',
            `<p>Hola ${cliente?.nombre},</p><p>Adjunto tu recibo.</p><a href="${publicUrl}">Ver recibo</a>`
          );

          console.log('email enviado:', emailSend);

          console.log(`✅ PDF subido: ${publicUrl}`);
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

    return this.prisma.recibo.findMany({
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
          },
        },
      },
      orderBy: {
        Fechacrecion: 'desc',
      },
    });
  }
  //logica para actualizar un recibo y sus relaciones
  async actualizarRecibo(
    id: string,
    data: UpdateReciboDto,
    usuario: UsuarioPayload
  ) {
    if (!usuario) {
      throw new UnauthorizedException('Usuario no autorizado');
    }
    const { clienteId } = data;
    if (!clienteId) throw new UnauthorizedException('Usuario no autorizado');
    await this.validarClienteVendedor(clienteId, usuario);
    const recibo = await this.prisma.recibo.findUnique({
      where: { id },
      include: {
        detalleRecibo: true,
      },
    });

    if (!recibo) {
      throw new NotFoundException('Recibo no encontrado');
    }

    if (usuario.rol !== 'admin') {
      throw new UnauthorizedException(
        'No tienes permiso para editar este recibo'
      );
    }

    // Validar saldos antes de modificar, considerando valores previos del recibo
    if (data.pedidos) {
      for (const pedido of data.pedidos) {
        const detalleAnterior = recibo.detalleRecibo.find(
          (d) => d.idPedido === pedido.pedidoId
        );

        const valorPrevio = detalleAnterior?.valorTotal || 0;
        const valorNuevo = pedido.valorAplicado;

        const diferencia = valorNuevo - valorPrevio;

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
        cliente: {
          connect: { id: data.clienteId },
        },
      },
    });

    // Borrar detalles antiguos
    await this.prisma.detalleRecibo.deleteMany({
      where: { idRecibo: id },
    });

    // Registrar nuevos detalles
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
      }
    }

    // PDF actualizado en segundo plano
    setImmediate(() => {
      void (async () => {
        try {
          const cliente = await this.prisma.cliente.findUnique({
            where: { id: data.clienteId },
            select: {
              nombre: true,
              apellidos: true,
              rasonZocial: true,
            },
          });

          const detallesActualizados = await this.prisma.detalleRecibo.findMany(
            {
              where: { idRecibo: id },
              include: {
                pedido: true,
              },
            }
          );

          const resumenRecibo: ResumenReciboDto = {
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
          };

          const pdfBuffer =
            await this.pdfUploaderService.generarReciboPDF(resumenRecibo);

          const outputPath = path.join(
            'C:',
            'Users',
            'USUARIO',
            'Desktop',
            'pdfs',
            `recibo_${id}${cliente?.nombre}.pdf`
          );

          if (fs.existsSync(outputPath)) {
            await unlink(outputPath);
          }

          await writeFile(outputPath, pdfBuffer.buffer);
          console.log(`✅ PDF actualizado: ${outputPath}`);
        } catch (err) {
          console.error('❌ Error generando nuevo PDF de recibo:', err);
        }
      })();
    });

    return {
      mensaje: 'Recibo actualizado con éxito',
      recibo: reciboActualizado,
    };
  }

  //logica para obtener acceso a un recibo por su id
  async getReciboPorId(id: string, usuario: UsuarioPayload) {
    if (!usuario) throw new UnauthorizedException('Usuario no autorizado');

    const recibo = await this.prisma.recibo.findUnique({
      where: { id },
      include: {
        cliente: true,
        detalleRecibo: true,
        usuario: true,
      },
    });

    if (!recibo) {
      throw new NotFoundException('Recibo no encontrado');
    }

    // Verificar permisos (admin o vendedor propietario)
    const esAdmin = usuario.rol === 'admin';
    const esVendedorPropietario = recibo.usuarioId === usuario.id;

    if (!esAdmin && !esVendedorPropietario) {
      throw new UnauthorizedException('No tienes acceso a este recibo');
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
}
