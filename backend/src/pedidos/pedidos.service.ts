import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
import { FilterPedidoDto } from './dto/filter-pedido.dto';
import { ResumenPedidoDto } from 'src/pdf-uploader/dto/resumen-pedido.dto';
import { PdfUploaderService } from 'src/pdf-uploader/pdf-uploader.service';

import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { ResendService } from 'src/resend/resend.service';
import { HetznerStorageService } from 'src/hetzner-storage/hetzner-storage.service';
import { Prisma } from '@prisma/client';
type PedidoParaPDF = Prisma.PedidoGetPayload<{
  include: {
    cliente: true;
    empresa: true;
    usuario: { select: { nombre: true; telefono: true } };
    productos: { include: { producto: true } };
  };
}>;
@Injectable()
export class PedidosService {
  constructor(
    private prisma: PrismaService,
    private pdfUploaderService: PdfUploaderService,
    private cloudinaryService: CloudinaryService,
    private resend: ResendService,
    private hetznerStorage: HetznerStorageService
  ) {}

  private async generarYSubirPDFPedido(pedido: PedidoParaPDF) {
    const total = pedido.productos.reduce(
      (s, p) => s + p.cantidad * p.precio,
      0
    );

    const resumen: ResumenPedidoDto = {
      nitCliente: pedido.cliente.nit,
      direccionCliente: pedido.cliente.direccion,
      telefonoCliente: pedido.cliente.telefono,
      departamentoCliente: pedido.cliente.departamento,
      emailCliente: pedido.cliente.email,
      ciudadCliente: pedido.cliente.ciudad,
      id: pedido.id,
      nombreEmpresa: pedido.empresa.nombreComercial,
      direccionEmpresa: pedido.empresa.direccion,
      telefonoEmpresa: pedido.empresa.telefono,
      cliente:
        pedido.cliente.rasonZocial ||
        `${pedido.cliente.nombre} ${pedido.cliente.apellidos}`,
      fecha: new Date(),
      vendedor: pedido.usuario?.nombre || '',
      observaciones: pedido.observaciones ?? '',
      productos: pedido.productos.map((i) => ({
        nombre: i.producto.nombre,
        cantidad: i.cantidad,
        precio: i.precio,
        subtotal: i.cantidad * i.precio,
      })),
      logoUrl: pedido.empresa.logoUrl,
      total,
    };

    const pdfBuffer = await this.pdfUploaderService.generarPedidoPDF(resumen);
    const folder = `empresas/${pedido.empresaId}/pedidos`;
    const url = await this.hetznerStorage.uploadFile(
      pdfBuffer.buffer,
      `pedido_${pedido.id}.pdf`,
      folder
    );

    await this.prisma.pedido.update({
      where: { id: pedido.id },
      data: { pdfUrl: url },
    });
    return url;
  }

  ///crea un pedido en la bdd y sus relaciones
  async crearPedido(data: CreatePedidoDto, usuario: UsuarioPayload) {
    // 1) Validaciones
    const ids = data.productos.map((p) => p.productoId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'No se permiten productos duplicados en el pedido'
      );
    }

    const { empresaId } = usuario;
    const totalCalculado = data.productos.reduce(
      (s, p) => s + p.cantidad * p.precio,
      0
    );

    const relacion = await this.prisma.clienteEmpresa.findFirst({
      where: { clienteId: data.clienteId, empresaId },
      include: { usuario: true },
    });
    if (!relacion?.usuario)
      throw new BadRequestException('No hay usuario asociado a este cliente');

    const vendedorId = relacion.usuario.id;

    // 2) Transacción mínima (solo DB)
    const pedidoId = await this.prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.create({
        data: {
          clienteId: data.clienteId,
          observaciones: data.observaciones,
          empresaId,
          usuarioId: vendedorId,
          total: totalCalculado,
        },
      });

      await tx.detallePedido.createMany({
        data: data.productos.map((p) => ({
          pedidoId: pedido.id,
          productoId: p.productoId,
          cantidad: p.cantidad,
          precio: p.precio,
        })),
      });

      await tx.estadoPedido.create({
        data: { pedidoId: pedido.id, estado: 'GENERADO' },
      });

      return pedido.id;
    });

    // 3) Cargar el pedido completo ya fuera de la transacción
    const pedidoCreado = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        productos: { include: { producto: true } },
        cliente: true,
        usuario: { select: { nombre: true, telefono: true } },
        empresa: true,
        estados: { orderBy: { fechaEstado: 'desc' } },
      },
    });

    // 4) Generar/subir PDF en segundo plano (no bloquea la respuesta)
    if (pedidoCreado) {
      setImmediate(() => {
        void this.generarYSubirPDFPedido(pedidoCreado as PedidoParaPDF).catch(
          (err) => console.error('Error generando PDF al crear:', err)
        );
      });
    }

    // Devuelves el pedido (pdfUrl se llenará poco después)
    return pedidoCreado;
  }

  ///// cambia el estado del pedido y verifica si esta facturado lo descuenta del stock
  ///// se le debe enviar el id del pedido
  async agregarEstado(
    pedidoId: string,
    estado: string,
    guiaTransporte?: string,
    flete?: number
  ) {
    const estadoNormalizado = estado.toUpperCase();

    const yaTieneEstado = await this.prisma.estadoPedido.findFirst({
      where: { pedidoId, estado: estadoNormalizado },
    });

    if (yaTieneEstado) {
      throw new BadRequestException(
        `El pedido ya tiene el estado "${estadoNormalizado}"`
      );
    }

    if (['SEPARADO'].includes(estadoNormalizado)) {
      return this.prisma.estadoPedido.create({
        data: { pedidoId, estado: estadoNormalizado },
      });
    }

    if (estadoNormalizado === 'FACTURADO') {
      const [pedido, tipoSalida] = await Promise.all([
        this.prisma.pedido.findUnique({
          where: { id: pedidoId },
          include: {
            productos: {
              include: {
                producto: { select: { nombre: true } },
              },
            },
            cliente: true,
            usuario: {
              select: { nombre: true, telefono: true },
            },
            empresa: {
              select: {
                telefono: true,
                logoUrl: true,
                nombreComercial: true,
                direccion: true,
              },
            },
          },
        }),
        this.prisma.tipoMovimientos.findFirst({
          where: { tipo: 'SALIDA' },
          select: { idTipoMovimiento: true },
        }),
      ]);

      if (!pedido) throw new BadRequestException('Pedido no encontrado');
      if (!tipoSalida)
        throw new BadRequestException("No se encontró tipo 'SALIDA'");

      const productosIds = pedido.productos.map((p) => p.productoId);
      const inventarios = await this.prisma.inventario.findMany({
        where: {
          idProducto: { in: productosIds },
          idEmpresa: pedido.empresaId,
        },
        select: { idProducto: true, stockActual: true },
      });

      const inventarioMap = new Map(
        inventarios.map((i) => [i.idProducto, i.stockActual])
      );
      for (const item of pedido.productos) {
        const stock = inventarioMap.get(item.productoId);
        if (stock === undefined || stock < item.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para producto ${item.productoId}. Disponible: ${stock}, requerido: ${item.cantidad}`
          );
        }
      }

      const updatesInventario = pedido.productos.map((item) =>
        this.prisma.inventario.updateMany({
          where: { idProducto: item.productoId, idEmpresa: pedido.empresaId },
          data: { stockActual: { decrement: item.cantidad } },
        })
      );

      const movimientosInventario = pedido.productos.map((item) =>
        this.prisma.movimientoInventario.create({
          data: {
            idEmpresa: pedido.empresaId,
            idProducto: item.productoId,
            cantidadMovimiendo: item.cantidad,
            idTipoMovimiento: tipoSalida.idTipoMovimiento,
            IdUsuario: pedido.usuarioId,
            IdPedido: pedido.id,
          },
        })
      );

      const movimientoCartera = this.prisma.movimientosCartera.create({
        data: {
          idCliente: pedido.clienteId,
          idUsuario: pedido.usuarioId,
          empresaId: pedido.empresaId,
          valorMovimiento: pedido.total,
          idPedido: pedido.id,
          tipoMovimientoOrigen: 'PEDIDO',
        },
      });

      const nuevoEstado = this.prisma.estadoPedido.create({
        data: { pedidoId, estado: estadoNormalizado },
      });

      const [estadoCreado] = await Promise.all([
        this.prisma
          .$transaction([
            ...updatesInventario,
            ...movimientosInventario,
            movimientoCartera,
            nuevoEstado,
          ])
          .then((res) => res[res.length - 1]),
      ]);

      // Generar y subir el PDF sin bloquear la respuesta
      setImmediate(() => {
        void (async () => {
          try {
            const resumen: ResumenPedidoDto = {
              nitCliente: pedido.cliente.nit,
              direccionCliente: pedido.cliente.direccion,
              telefonoCliente: pedido.cliente.telefono,
              departamentoCliente: pedido.cliente.departamento,
              emailCliente: pedido.cliente.email,
              ciudadCliente: pedido.cliente.ciudad,
              id: pedido.id,
              nombreEmpresa: pedido.empresa.nombreComercial,
              direccionEmpresa: pedido.empresa.direccion,
              telefonoEmpresa: pedido.empresa.telefono,
              cliente:
                pedido.cliente.rasonZocial ||
                `${pedido.cliente.nombre} ${pedido.cliente.apellidos}`,
              fecha: new Date(),
              vendedor: pedido.usuario.nombre,
              observaciones: pedido.observaciones ?? '',
              productos: pedido.productos.map((item) => ({
                nombre: item.producto.nombre,
                cantidad: item.cantidad,
                precio: item.precio,
                subtotal: item.cantidad * item.precio,
              })),
              logoUrl: pedido.empresa.logoUrl,
              total: pedido.productos.reduce(
                (sum, item) => sum + item.cantidad * item.precio,
                0
              ),
            };

            const pdfBuffer =
              await this.pdfUploaderService.generarPedidoPDF(resumen);

            //aca
            const folder = `empresas/${pedido.empresaId}/pedidos`;

            const url = await this.hetznerStorage.uploadFile(
              pdfBuffer.buffer,
              `pedido_${pedido.id}.pdf`,
              folder
            );

            // const { url } = await this.cloudinaryService.uploadPdf({
            //   buffer: pdfBuffer.buffer,
            //   fileName: `pedido_${pedido.id}.pdf`,
            //   empresaNit: pedido.empresaId, // si tienes nit directo usa ese
            //   empresaNombre: resumen.cliente,
            //   usuarioNombre: resumen.vendedor,
            //   tipo: 'pedidos',
            // });
            await this.prisma.pedido.update({
              where: { id: pedido.id },
              data: { pdfUrl: url },
            });

            if (!pedido.cliente?.email)
              throw new Error('Error al obtener email');
            const numeroWhatsApp = `+57${pedido.usuario?.telefono?.replace(/\D/g, '')}`;
            await this.resend.enviarCorreo(
              pedido.cliente.email,
              'Confirmación de tu pedido',
              `
  <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
    <p>Hola <strong>${pedido.cliente.nombre}</strong>,</p>

    <p>Tu pedido ha sido <strong>facturado exitosamente</strong>. Adjuntamos el comprobante en PDF:</p>

    <p style="margin: 16px 0;">
      <a href="${url}" target="_blank"
         style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
        Ver Comprobante PDF
      </a>
    </p>

    <p>¿Tienes alguna duda o deseas hacer otro pedido? Contáctanos:</p>

    <p>
      <a href="https://wa.me/${numeroWhatsApp}" target="_blank"
         style="display: inline-block; padding: 8px 16px; background-color: #25D366; color: white; text-decoration: none; border-radius: 6px;">
        💬 Contactar por WhatsApp
      </a>
    </p>

    <p style="margin-top: 30px;">Gracias por tu compra,</p>
    <p><strong>Equipo de Ventas</strong></p>
  </div>
  `
            );
          } catch (error) {
            console.error(
              '❌ Error al generar/subir PDF en segundo plano:',
              error
            );
          }
        })();
      });

      return estadoCreado;
    }

    if (estadoNormalizado === 'ENVIADO') {
      const fechaEnviado = new Date();

      // ✅ Agregar logs para debug

      const [, estadoNuevo] = await this.prisma.$transaction([
        this.prisma.pedido.update({
          where: { id: pedidoId },
          data: {
            fechaEnvio: fechaEnviado,
            guiaTransporte: guiaTransporte || null,
            flete: flete || null,
          },
        }),
        this.prisma.estadoPedido.create({
          data: { pedidoId, estado: estadoNormalizado },
        }),
      ]);

      return estadoNuevo;
    }

    const accionesReversibles: any[] = [];

    if (estadoNormalizado === 'CANCELADO') {
      const pedidoExistente = await this.prisma.pedido.findUnique({
        where: { id: pedidoId },
        include: {
          productos: {
            include: {
              producto: { select: { nombre: true } },
            },
          },
          cliente: {
            select: {
              nombre: true,
              apellidos: true,
              rasonZocial: true,
              ciudad: true,
              email: true,
            },
          },
          usuario: {
            select: { nombre: true, telefono: true },
          },
          empresa: {
            select: {
              telefono: true,
              logoUrl: true,
              nombreComercial: true,
              direccion: true,
            },
          },
          estados: true,
        },
      });
      if (!pedidoExistente) throw new Error('no se encontro pedido');

      const tuvoEstadoFacturado = pedidoExistente.estados.some(
        (estado) => estado.estado === 'FACTURADO'
      );
      if (tuvoEstadoFacturado) {
        for (const item of pedidoExistente.productos) {
          accionesReversibles.push(
            this.prisma.inventario.updateMany({
              where: {
                idProducto: item.productoId,
                idEmpresa: pedidoExistente.empresaId,
              },
              data: {
                stockActual: { increment: item.cantidad },
              },
            })
          );

          accionesReversibles.push(
            this.prisma.movimientoInventario.deleteMany({
              where: { IdPedido: pedidoExistente.id },
            })
          );
        }
      }
      accionesReversibles.push(
        this.prisma.detallePedido.deleteMany({
          where: { pedidoId },
        })
      );

      accionesReversibles.push(
        this.prisma.movimientosCartera.deleteMany({
          where: { idPedido: pedidoExistente.id },
        })
      );
      accionesReversibles.push(
        this.prisma.estadoPedido.create({
          data: {
            pedidoId,
            estado: estadoNormalizado,
          },
        })
      );

      await this.prisma.$transaction(accionesReversibles);

      const pedidoActualizado = await this.prisma.pedido.update({
        where: { id: pedidoExistente.id },
        data: { guiaTransporte: '', flete: 0, total: 0 },
      });

      return pedidoActualizado;
    }

    return this.prisma.estadoPedido.create({
      data: { pedidoId, estado: estadoNormalizado },
    });
  }

  ///////////////////////////////
  async obtenerPedidos(usuario: UsuarioPayload) {
    if (!usuario) throw new BadRequestException('El usuario es requerido');
    const { empresaId, id: usuarioId, rol } = usuario;

    const pedidos = await this.prisma.pedido.findMany({
      where:
        rol === 'admin' || rol === 'bodega'
          ? {
              empresaId: empresaId,
            }
          : {
              empresaId,
              usuarioId,
            },
      include: {
        cliente: true,
        usuario: true,
        productos: {
          include: {
            producto: true, // ✅ Incluir información del producto
          },
        },
        estados: {
          orderBy: {
            fechaEstado: 'desc', // ✅ Ordenar estados por fecha
          },
        },
      },
      orderBy: {
        fechaPedido: 'desc', // ✅ Ordenar pedidos por fecha más reciente
      },
    });

    // ✅ Agregar log para verificar datos

    return pedidos;
  }

  ////////////////////////////////////////////////////////////////
  //actualizar un pedido con el update

  // ...
  // type PedidoParaPDF = Prisma.PedidoGetPayload<{ include: { ... } }>
  // private async generarYSubirPDFPedido(pedido: PedidoParaPDF) { ... }

  async actualizarPedido(
    pedidoId: string,
    data: UpdatePedidoDto,
    usuario: UsuarioPayload
  ) {
    const { rol, empresaId, id: usuarioId } = usuario;
    if (rol !== 'admin' && rol !== 'bodega') {
      throw new UnauthorizedException('No está autorizado');
    }

    // 1) Cargar pedido actual (para conocer estado previo)
    const pedidoExistente = await this.prisma.pedido.findUnique({
      where: { id: pedidoId, empresaId },
      include: {
        productos: true,
        estados: { orderBy: { fechaEstado: 'desc' }, take: 1 },
        cliente: true,
      },
    });
    if (!pedidoExistente) {
      throw new BadRequestException('Pedido no encontrado');
    }

    const estadoPrevio = pedidoExistente.estados[0]?.estado || 'GENERADO';

    // 2) Si estaba FACTURADO/ENVIADO, revertir inventario/cartera previos
    if (['FACTURADO', 'ENVIADO'].includes(estadoPrevio)) {
      const accionesReversibles: Prisma.PrismaPromise<unknown>[] = [];

      for (const item of pedidoExistente.productos) {
        accionesReversibles.push(
          this.prisma.inventario.updateMany({
            where: { idProducto: item.productoId, idEmpresa: empresaId },
            data: { stockActual: { increment: item.cantidad } },
          })
        );
      }
      accionesReversibles.push(
        this.prisma.movimientoInventario.deleteMany({
          where: { IdPedido: pedidoExistente.id },
        })
      );
      accionesReversibles.push(
        this.prisma.movimientosCartera.deleteMany({
          where: { idPedido: pedidoExistente.id },
        })
      );

      await this.prisma.$transaction(accionesReversibles);
    }

    // 3) Reemplazar detalles y actualizar datos principales
    await this.prisma.detallePedido.deleteMany({ where: { pedidoId } });

    const pedidoActualizado = await this.prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        ...data,
        productos: {
          create:
            data.productos?.map((item) => ({
              productoId: item.productoId,
              cantidad: item.cantidad,
              precio: item.precio,
            })) ?? [],
        },
      },
      include: {
        productos: { include: { producto: true } },
        cliente: true,
        usuario: { select: { nombre: true, telefono: true } },
        empresa: true,
      },
    });

    // 4) Recalcular total y persistir
    const totalCalculado = pedidoActualizado.productos.reduce(
      (sum, p) => sum + p.cantidad * p.precio,
      0
    );
    await this.prisma.pedido.update({
      where: { id: pedidoId },
      data: { total: totalCalculado },
    });

    // 5) Si estaba FACTURADO/ENVIADO, volver a aplicar inventario/cartera con los nuevos detalles
    if (['FACTURADO', 'ENVIADO'].includes(estadoPrevio)) {
      const tipoSalida = await this.prisma.tipoMovimientos.findFirst({
        where: { tipo: 'SALIDA' },
        select: { idTipoMovimiento: true },
      });
      if (!tipoSalida) {
        throw new BadRequestException('No se encontró el tipo SALIDA');
      }

      const acciones: Prisma.PrismaPromise<unknown>[] = [];
      for (const item of pedidoActualizado.productos) {
        acciones.push(
          this.prisma.inventario.updateMany({
            where: { idProducto: item.productoId, idEmpresa: empresaId },
            data: { stockActual: { decrement: item.cantidad } },
          })
        );
        acciones.push(
          this.prisma.movimientoInventario.create({
            data: {
              idEmpresa: empresaId,
              idProducto: item.productoId,
              cantidadMovimiendo: item.cantidad,
              idTipoMovimiento: tipoSalida.idTipoMovimiento,
              IdUsuario: usuarioId,
              IdPedido: pedidoActualizado.id,
            },
          })
        );
      }
      acciones.push(
        this.prisma.movimientosCartera.create({
          data: {
            idCliente: pedidoActualizado.clienteId,
            idUsuario: pedidoActualizado.usuarioId,
            empresaId,
            valorMovimiento: totalCalculado,
            idPedido: pedidoActualizado.id,
            tipoMovimientoOrigen: 'PEDIDO',
          },
        })
      );

      await this.prisma.$transaction(acciones);
    }

    // 6) Regenerar SIEMPRE el PDF (sobrescribe) y, si estaba FACTURADO/ENVIADO, enviar correo con el PDF nuevo
    setImmediate(() => {
      void (async () => {
        try {
          const pedidoParaPdf = await this.prisma.pedido.findUnique({
            where: { id: pedidoId },
            include: {
              productos: { include: { producto: true } },
              cliente: true,
              usuario: { select: { nombre: true, telefono: true } },
              empresa: true,
              estados: { orderBy: { fechaEstado: 'desc' } },
            },
          });
          if (!pedidoParaPdf) return;

          const url = await this.generarYSubirPDFPedido(
            pedidoParaPdf as PedidoParaPDF
          );

          if (
            ['FACTURADO', 'ENVIADO'].includes(estadoPrevio) &&
            pedidoParaPdf.cliente?.email
          ) {
            const numeroWhatsApp = `+57${pedidoParaPdf.usuario?.telefono?.replace(
              /\D/g,
              ''
            )}`;

            await this.resend.enviarCorreo(
              pedidoParaPdf.cliente.email,
              'Actualización de tu pedido',
              `
<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
  <p>Hola <strong>${pedidoParaPdf.cliente.nombre}</strong>,</p>
  <p>Tu pedido ha sido actualizado y sigue en estado <strong>${estadoPrevio}</strong>. Adjuntamos el comprobante en PDF:</p>
  <p style="margin: 16px 0;">
    <a href="${url}?t=${Date.now()}" target="_blank"
       style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
      Ver Comprobante PDF
    </a>
  </p>
  <p>¿Tienes alguna duda o deseas hacer otro pedido? Contáctanos:</p>
  <p>
    <a href="https://wa.me/${numeroWhatsApp}" target="_blank"
       style="display: inline-block; padding: 8px 16px; background-color: #25D366; color: white; text-decoration: none; border-radius: 6px;">
      💬 Contactar por WhatsApp
    </a>
  </p>
  <p style="margin-top: 30px;">Gracias por tu compra,</p>
  <p><strong>Equipo de Ventas</strong></p>
</div>`
            );
          }
        } catch (err) {
          console.error('Error generando/enviando PDF tras update:', err);
        }
      })();
    });

    // 7) Devolver el pedido final consistente
    const pedidoFinal = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        productos: { include: { producto: true } },
        cliente: true,
        usuario: { select: { nombre: true, telefono: true } },
        empresa: true,
        estados: { orderBy: { fechaEstado: 'desc' } },
      },
    });

    return pedidoFinal!;
  }

  /////////////////////////////////////////////////////////////////////
  async obtenerPedidosFiltro(data: FilterPedidoDto, usuario: UsuarioPayload) {
    const { filtro, tipoFiltro } = data;
    if (!usuario) throw new BadRequestException('El usuario es requerido');

    // Validar que solo se acepten filtros válidos
    const filtrosValidos = [
      'id',
      'clienteId',
      'usuarioId',
      'total',
      'empresaId',
      'fechaPedido',
    ];
    if (!filtrosValidos.includes(tipoFiltro)) {
      throw new BadRequestException(`Filtro no válido: ${tipoFiltro}`);
    }

    // Construir cláusula where dinámica
    const whereClausula: Record<string, unknown> = {
      [tipoFiltro]: tipoFiltro === 'total' ? parseFloat(filtro) : filtro,
      empresaId: usuario.empresaId,
    };

    const pedidos = await this.prisma.pedido.findMany({
      where: whereClausula,
      include: {
        cliente: true,
        productos: true,
      },
    });

    return pedidos;
  }
}
