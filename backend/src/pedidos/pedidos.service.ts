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
    // Validar que no haya productos duplicados
    const ids = data.productos.map((p) => p.productoId);
    const set = new Set(ids);
    if (set.size !== ids.length) {
      throw new BadRequestException(
        'No se permiten productos duplicados en el pedido'
      );
    }

    const { empresaId, id: usuarioId } = usuario;

    const totalCalculado = data.productos.reduce(
      (sum, p) => sum + p.cantidad * p.precio,
      0
    );

    return await this.prisma.$transaction(async (tx) => {
      // Paso 1: Crear el pedido sin productos aún
      const pedido = await tx.pedido.create({
        data: {
          clienteId: data.clienteId,
          observaciones: data.observaciones,
          empresaId,
          usuarioId,
          total: totalCalculado,
        },
      });

      // Paso 2: Insertar los productos (DetallePedido)
      await tx.detallePedido.createMany({
        data: data.productos.map((p) => ({
          pedidoId: pedido.id,
          productoId: p.productoId,
          cantidad: p.cantidad,
          precio: p.precio,
        })),
      });

      // Paso 3: Registrar el estado 'GENERADO'
      await tx.estadoPedido.create({
        data: {
          pedidoId: pedido.id,
          estado: 'GENERADO',
        },
      });

      // Paso 4: Retornar el pedido completo con relaciones
      return tx.pedido.findUnique({
        where: { id: pedido.id },
        include: {
          productos: {
            include: { producto: true },
          },
          cliente: true,
          usuario: true,
          empresa: true,
          estados: {
            orderBy: { fechaEstado: 'desc' },
          },
        },
      });
    });
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
                `${pedido.cliente.nombre} ${pedido.cliente.apellidos}`,
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

      // ✅ Agregar logs para debug
      console.log('📦 Datos recibidos para ENVIADO:', {
        pedidoId,
        guiaTransporte,
        flete,
        tipoFlete: typeof flete,
      });

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

      console.log('✅ Estado ENVIADO creado exitosamente');
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
        },
      });
      if (!pedidoExistente) throw new Error('no se encontro pedido');
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
    console.log('📋 Pedidos obtenidos:');
    pedidos.slice(0, 3).forEach((pedido) => {
      console.log(`Pedido ${pedido.id.slice(-8)}:`, {
        flete: pedido.flete,
        guiaTransporte: pedido.guiaTransporte,
        fechaEnvio: pedido.fechaEnvio,
      });
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
    const { rol, empresaId } = usuario;
    if (rol !== 'admin' && rol !== 'bodega')
      throw new UnauthorizedException('no esta autorizado ');
    const pedidoExistente = await this.prisma.pedido.findUnique({
      where: { id: pedidoId, empresaId: empresaId },
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

    // ACTUALIZAR EL TOTAL EN LA BASE DE DATOS
    await this.prisma.pedido.update({
      where: { id: pedidoId },
      data: { total: totalCalculado },
    });

    const tipoSalida = await this.prisma.tipoMovimientos.findFirst({
      where: { tipo: 'SALIDA' },
    });

    if (!tipoSalida) {
      throw new BadRequestException(
        'No se encontró el tipo de movimiento "SALIDA"'
      );
    }

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
