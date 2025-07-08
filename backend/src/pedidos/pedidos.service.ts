import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
import { FilterPedidoDto } from './dto/filter-pedido.dto';
import { ResumenPedidoDto } from 'src/pdf-uploader/dto/resumen-pedido.dto';
import { PdfUploaderService } from 'src/pdf-uploader/pdf-uploader.service';
import * as fs from 'fs';
import { unlink, writeFile } from 'fs/promises';
import * as path from 'path';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { ResendService } from 'src/resend/resend.service';

@Injectable()
export class PedidosService {
  constructor(
    private prisma: PrismaService,
    private pdfUploaderService: PdfUploaderService,
    private cloudinaryService: CloudinaryService,
    private resend: ResendService
  ) {}

  ///crea un pedido en la bdd y sus relaciones
  async crearPedido(data: CreatePedidoDto, usuario: UsuarioPayload) {
    //  Validación: no permitir productos duplicados
    const ids = data.productos.map((p) => p.productoId);
    const set = new Set(ids);
    if (set.size !== ids.length) {
      throw new BadRequestException(
        'No se permiten productos duplicados en el pedido'
      );
    }
    //se calcula el total del pedido antes de crear el pedido
    const totalCalculado = data.productos.reduce((sum, p) => {
      return sum + p.cantidad * p.precio;
    }, 0);
    const { empresaId, id } = usuario;

    //console.log('est es la empresa logueada :', empresaId);
    const pedido = await this.prisma.pedido.create({
      data: {
        ...data,
        empresaId: empresaId,
        usuarioId: id,
        estados: {
          create: {
            estado: 'GENERADO',
          },
        },

        productos: {
          create: data.productos.map((p) => ({
            productoId: p.productoId,
            cantidad: p.cantidad,
            precio: p.precio,
          })),
        },
        total: totalCalculado,
      },
      include: {
        productos: true,
      },
    });
    return pedido;
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

    if (['SEPARADO', 'CANCELADO'].includes(estadoNormalizado)) {
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

      console.log('antes de entrar al setinmediatte');

      // Generar y subir el PDF sin bloquear la respuesta
      setImmediate(() => {
        console.log('entando al setinmediate');
        void (async () => {
          try {
            const resumen: ResumenPedidoDto = {
              emailCliente: pedido.cliente.email,
              ciudadCliente: pedido.cliente.ciudad,
              id: pedido.id,
              nombreEmpresa: pedido.empresa.nombreComercial,
              direccionEmpresa: pedido.empresa.direccion,
              telefonoEmpresa: pedido.empresa.telefono,
              cliente:
                pedido.cliente.rasonZocial ||
                `${pedido.cliente.nombre}, ${pedido.cliente.apellidos}`,
              fecha: new Date(),
              vendedor: pedido.usuario.nombre,
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

            const { url } = await this.cloudinaryService.uploadPdf({
              buffer: pdfBuffer.buffer,
              fileName: `pedido_${pedido.id}.pdf`,
              empresaNit: pedido.empresaId, // si tienes nit directo usa ese
              empresaNombre: resumen.cliente,
              usuarioNombre: resumen.vendedor,
              tipo: 'pedidos',
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

            console.log(`✅ PDF subido a Cloudinary: ${url}`);
          } catch (error) {
            console.error(
              '❌ Error al generar/subir PDF en segundo plano:',
              error
            );
          }
        })();
      });
      console.log('siliendo del setinmediate');

      return estadoCreado;
    }

    if (estadoNormalizado === 'ENVIADO') {
      const fechaEnviado = new Date();
      const [, estadoNuevo] = await this.prisma.$transaction([
        this.prisma.pedido.update({
          where: { id: pedidoId },
          data: {
            fechaEnvio: fechaEnviado,
            guiaTransporte: guiaTransporte,
            flete: flete,
          },
        }),
        this.prisma.estadoPedido.create({
          data: { pedidoId, estado: estadoNormalizado },
        }),
      ]);

      return estadoNuevo;
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
        rol === 'admin'
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

    return pedidos;
  }
  ////////////////////////////////////////////////////////////////
  //actualizar un pedido con el update
  async actualizarPedido(
    pedidoId: string,
    data: UpdatePedidoDto,
    usuario: UsuarioPayload
  ) {
    const pedidoExistente = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        productos: true,
        estados: {
          orderBy: { fechaEstado: 'desc' },
          take: 1,
        },
      },
    });

    if (!pedidoExistente) {
      throw new BadRequestException('Pedido no encontrado');
    }

    const ultimoEstado = pedidoExistente.estados[0]?.estado;
    const accionesReversibles: any[] = [];

    if (ultimoEstado === 'FACTURADO') {
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

      accionesReversibles.push(
        this.prisma.movimientosCartera.deleteMany({
          where: { idPedido: pedidoExistente.id },
        })
      );

      await this.prisma.$transaction(accionesReversibles);
    }

    await this.prisma.detallePedido.deleteMany({
      where: { pedidoId },
    });

    const pedidoActualizado = await this.prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        ...data,
        productos: {
          create: data.productos?.map((item) => ({
            productoId: item.productoId,
            cantidad: item.cantidad,
            precio: item.precio,
          })),
        },
      },
      include: {
        productos: {
          include: { producto: true },
        },
        cliente: true,
        usuario: {
          select: { nombre: true, telefono: true },
        },
        empresa: true,
      },
    });

    const totalCalculado = pedidoActualizado.productos.reduce(
      (sum, p) => sum + p.cantidad * p.precio,
      0
    );

    const tipoSalida = await this.prisma.tipoMovimientos.findFirst({
      where: { tipo: 'SALIDA' },
    });

    if (!tipoSalida) {
      throw new BadRequestException(
        'No se encontró el tipo de movimiento "SALIDA"'
      );
    }

    const actualizacionesStock = pedidoActualizado.productos.map((item) =>
      this.prisma.inventario.updateMany({
        where: {
          idProducto: item.productoId,
          idEmpresa: pedidoActualizado.empresaId,
        },
        data: {
          stockActual: { decrement: item.cantidad },
        },
      })
    );

    const movimientos = pedidoActualizado.productos.map((item) =>
      this.prisma.movimientoInventario.create({
        data: {
          idEmpresa: pedidoActualizado.empresaId,
          idProducto: item.productoId,
          cantidadMovimiendo: item.cantidad,
          idTipoMovimiento: tipoSalida.idTipoMovimiento,
          IdUsuario: usuario.id,
          IdPedido: pedidoActualizado.id,
        },
      })
    );

    const movimientoCartera = this.prisma.movimientosCartera.create({
      data: {
        idCliente: pedidoActualizado.clienteId,
        idUsuario: usuario.id,
        empresaId: pedidoActualizado.empresaId,
        valorMovimiento: totalCalculado,
        idPedido: pedidoActualizado.id,
        tipoMovimientoOrigen: 'PEDIDO',
      },
    });

    await this.prisma.$transaction([
      ...actualizacionesStock,
      ...movimientos,
      movimientoCartera,
    ]);

    // ✅ Generar PDF en segundo plano
    setImmediate(() => {
      void (async () => {
        try {
          const clienteNombres = `${pedidoActualizado.cliente.nombre}, ${pedidoActualizado.cliente.apellidos}`;
          const razonSocial = pedidoActualizado.cliente.rasonZocial;

          const resumenPedidoDto: ResumenPedidoDto = {
            emailCliente: pedidoActualizado.cliente.email,
            ciudadCliente: pedidoActualizado.cliente.ciudad,
            direccionEmpresa: pedidoActualizado.empresa.direccion,
            logoUrl: pedidoActualizado.empresa.logoUrl,
            nombreEmpresa: pedidoActualizado.empresa.nombreComercial,
            telefonoEmpresa: pedidoActualizado.empresa.telefono,
            id: pedidoActualizado.id,
            cliente: clienteNombres || razonSocial,
            fecha: new Date(),
            vendedor: pedidoActualizado.usuario.nombre,
            productos: pedidoActualizado.productos.map((item) => ({
              nombre: item.producto.nombre,
              cantidad: item.cantidad,
              precio: item.precio,
              subtotal: item.cantidad * item.precio,
            })),
            total: totalCalculado,
          };

          const pdfBuffer =
            await this.pdfUploaderService.generarPedidoPDF(resumenPedidoDto);

          const outputPath = path.join(
            'C:',
            'Users',
            'USUARIO',
            'Desktop',
            'pdfs',
            `pedido_${resumenPedidoDto.id}.pdf`
          );

          if (fs.existsSync(outputPath)) {
            await unlink(outputPath);
          }

          await writeFile(outputPath, pdfBuffer.buffer);
          console.log(`✅ PDF generado: ${outputPath}`);
        } catch (error) {
          console.error('❌ Error al generar PDF:', error);
        }
      })();
    });
    console.log('📤 Enviando respuesta al cliente');
    return pedidoActualizado;
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
