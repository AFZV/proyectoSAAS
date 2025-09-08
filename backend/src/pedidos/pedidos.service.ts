import {
  BadRequestException,
  Injectable,
  NotFoundException,
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
import { UpdateEnvioDto } from './dto/update-envio-pedido.dto';
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

    const { empresaId, id: ejecutorId, rol: rolEjecutor } = usuario;

    const totalCalculado = data.productos.reduce(
      (s, p) => s + p.cantidad * p.precio,
      0
    );

    // Trae el usuario asignado al cliente (con su rol)
    const relacion = await this.prisma.clienteEmpresa.findFirst({
      where: { clienteId: data.clienteId, empresaId },
      include: {
        usuario: {
          select: { id: true, rol: true, nombre: true, telefono: true },
        },
      },
    });

    if (!relacion?.usuario) {
      throw new BadRequestException('No hay usuario asociado a este cliente');
    }

    // Regla: si asignado es admin y quien ejecuta también es admin -> usar ejecutor
    const asignadoEsAdmin =
      (relacion.usuario.rol || '').toLowerCase() === 'admin';
    const ejecutorEsAdmin = (rolEjecutor || '').toLowerCase() === 'admin';
    const vendedorId =
      asignadoEsAdmin && ejecutorEsAdmin ? ejecutorId : relacion.usuario.id;

    // 2) Transacción mínima (solo DB)
    const pedidoId = await this.prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.create({
        data: {
          clienteId: data.clienteId,
          observaciones: data.observaciones,
          empresaId,
          usuarioId: vendedorId, // <- aquí aplicamos la regla
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
        productos: { include: { producto: true } }, // sin orderBy aquí
        cliente: true,
        usuario: { select: { nombre: true, telefono: true } },
        empresa: true,
        estados: { orderBy: { fechaEstado: 'desc' } },
      },
    });

    if (pedidoCreado) {
      // 🔹 Ordenar productos en memoria por nombre
      pedidoCreado.productos.sort((a, b) => {
        const nombreA = a.producto?.nombre?.toLowerCase() ?? '';
        const nombreB = b.producto?.nombre?.toLowerCase() ?? '';
        return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
      });
    }
    setImmediate(() => {
      void this.generarYSubirPDFPedido(pedidoCreado as PedidoParaPDF).catch(
        (err) => console.error('Error generando PDF al crear:', err)
      );
    });

    return pedidoCreado;
  }

  ///// cambia el estado del pedido y verifica si esta facturado lo descuenta del stock
  ///// se le debe enviar el id del pedido
  async agregarEstado(
    pedidoId: string,
    estado: string,
    usuario: UsuarioPayload,
    guiaTransporte?: string,
    flete?: number
  ) {
    const estadoNormalizado = estado.toUpperCase();

    // 👉 Funcióncita simple para anexar en observaciones (sin helpers externos)
    // Versión minimalista dentro de agregarEstado (o como helper)
    const anexarObs = async () => {
      // Actor + fecha/hora (Colombia)
      const actor = usuario ? `${usuario.nombre}`.trim() : 'Usuario';
      const marca = new Date().toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        hour12: false,
        dateStyle: 'short',
        timeStyle: 'short',
      });

      const linea = `[${marca}] Estado ${estadoNormalizado} por ${actor}`;

      // Leer observaciones actuales
      const ped = await this.prisma.pedido.findUnique({
        where: { id: pedidoId },
        select: { observaciones: true },
      });

      const prev = ped?.observaciones ?? '';

      // 👉 Quita espacios/nuevas líneas solo del final, y agrega una línea en blanco
      const prevLimpio = prev.replace(/\s+$/, ''); // similar a trimEnd()
      const nueva = prevLimpio
        ? `${prevLimpio}\n\n${linea}` // ← una línea en blanco entre entradas
        : linea;

      await this.prisma.pedido.update({
        where: { id: pedidoId },
        data: { observaciones: nueva },
      });
    };

    const yaTieneEstado = await this.prisma.estadoPedido.findFirst({
      where: { pedidoId, estado: estadoNormalizado },
    });

    if (yaTieneEstado) {
      throw new BadRequestException(
        `El pedido ya tiene el estado "${estadoNormalizado}"`
      );
    }

    if (['SEPARADO'].includes(estadoNormalizado)) {
      await anexarObs();
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
              orderBy: { producto: { nombre: 'asc' } },
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
            `Stock insuficiente para producto ${item.producto.nombre}. Disponible: ${stock}, requerido: ${item.cantidad}`
          );
        }
      }

      const updatesInventario = pedido.productos.map((item) =>
        this.prisma.inventario.updateMany({
          where: { idProducto: item.productoId, idEmpresa: pedido.empresaId },
          data: { stockActual: { decrement: item.cantidad } },
        })
      );

      const clienteNombre =
        pedido.cliente.rasonZocial && pedido.cliente.rasonZocial.trim() !== ''
          ? pedido.cliente.rasonZocial
          : `${pedido.cliente.nombre} ${pedido.cliente.apellidos}`.trim();

      const movimientosInventario = pedido.productos.map((item) =>
        this.prisma.movimientoInventario.create({
          data: {
            idEmpresa: pedido.empresaId,
            idProducto: item.productoId,
            cantidadMovimiendo: item.cantidad,
            idTipoMovimiento: tipoSalida.idTipoMovimiento,
            IdUsuario: pedido.usuarioId,
            IdPedido: pedido.id,
            observacion: `Venta por pedido ${pedido.id.slice(0, 6)} - Cliente: ${clienteNombre}`,
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
      await anexarObs();

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
              data: { pdfUrl: url, fechaActualizado: new Date() },
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
      await anexarObs();

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
    await anexarObs();
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
          orderBy: { producto: { nombre: 'asc' } },
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

    // ✅ 0) Garantiza un producto por línea (sin duplicados)
    const ids = (data.productos ?? []).map((p) => p.productoId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'No se permiten productos duplicados en el pedido'
      );
    }

    // ✅ 1) Todo lo crítico en UNA sola transacción
    const { estadoPrevio } = await this.prisma.$transaction(
      async (tx) => {
        // Cargar estado previo y datos base
        const pedidoPrevio = await tx.pedido.findUnique({
          where: { id: pedidoId, empresaId },
          include: {
            estados: { orderBy: { fechaEstado: 'desc' }, take: 1 },
            cliente: true,
            usuario: { select: { nombre: true, telefono: true } },
          },
        });
        if (!pedidoPrevio)
          throw new BadRequestException('Pedido no encontrado');

        const estadoPrevio = pedidoPrevio.estados[0]?.estado ?? 'GENERADO';
        const veniaFacturado = ['FACTURADO', 'ENVIADO'].includes(estadoPrevio);

        // Si venía facturado: revertir EXACTAMENTE lo que se había descontado (según movimientos)
        if (veniaFacturado) {
          const movPrevios = await tx.movimientoInventario.findMany({
            where: { IdPedido: pedidoId },
            select: { idProducto: true, cantidadMovimiendo: true },
          });

          if (movPrevios.length > 0) {
            for (const m of movPrevios) {
              await tx.inventario.updateMany({
                where: { idEmpresa: empresaId, idProducto: m.idProducto },
                data: { stockActual: { increment: m.cantidadMovimiendo } },
              });
            }
            await tx.movimientoInventario.deleteMany({
              where: { IdPedido: pedidoId },
            });
          }
          // Limpia cartera previa ligada a este pedido
          await tx.movimientosCartera.deleteMany({
            where: { idPedido: pedidoId },
          });
        }

        // Reemplazar detalles
        await tx.detallePedido.deleteMany({ where: { pedidoId } });
        if (data.productos?.length) {
          await tx.detallePedido.createMany({
            data: data.productos.map((it) => ({
              pedidoId,
              productoId: it.productoId,
              cantidad: it.cantidad,
              precio: it.precio,
            })),
          });
        }

        // Recalcular total (con los nuevos detalles)
        const totalCalculado = (data.productos ?? []).reduce(
          (acc, it) => acc + it.cantidad * it.precio,
          0
        );

        // 1) Actor (quién edita)
        const actor = await tx.usuario.findUnique({
          where: { id: usuarioId },
          select: { nombre: true, apellidos: true },
        });
        const actorNombre =
          `${actor?.nombre ?? 'Usuario'} ${actor?.apellidos ?? ''}`.trim();

        // 2) Marca de tiempo (Colombia)
        const marca = new Date().toLocaleString('es-CO', {
          timeZone: 'America/Bogota',
          hour12: false,
          dateStyle: 'short',
          timeStyle: 'short',
        });

        // 3) Línea de auditoría
        const lineaAudit = `[${marca}] Pedido EDITADO por ${actorNombre}`;

        // 4) Base de observaciones (si el front envió texto úsalo, si no, toma lo que ya hay)
        const pedObsPrev = await tx.pedido.findUnique({
          where: { id: pedidoId, empresaId },
          select: { observaciones: true },
        });

        const baseObs = data.observaciones ?? pedObsPrev?.observaciones ?? '';
        // limpiar solo el final para no borrar saltos previos
        const baseObsLimpia = baseObs.replace(/\s+$/, '');
        // Observaciones finales = base + línea en blanco + audit
        const observacionesFinal = baseObsLimpia
          ? `${baseObsLimpia}\n\n${lineaAudit}`
          : lineaAudit;

        // 5) Un solo update que NO se pisa después
        await tx.pedido.update({
          where: { id: pedidoId },
          data: {
            observaciones: observacionesFinal,
            total: totalCalculado,
            ...(data.clienteId ? { clienteId: data.clienteId } : {}),
          },
        });

        // Si venía facturado: validar stock y descontar + recrear cartera/movs (todo dentro de la misma tx)
        if (veniaFacturado && (data.productos?.length ?? 0) > 0) {
          const tipoSalida = await tx.tipoMovimientos.findFirst({
            where: { tipo: 'SALIDA' },
            select: { idTipoMovimiento: true },
          });
          if (!tipoSalida)
            throw new BadRequestException('No se encontró el tipo SALIDA');

          // Validación simple por línea (no hay productos repetidos)
          const inventarios = await tx.inventario.findMany({
            where: { idEmpresa: empresaId, idProducto: { in: ids } },
            include: { producto: { select: { nombre: true } } },
          });

          // Mapa productoId -> stock y productoId -> nombre
          const stockMap = new Map(
            inventarios.map((i) => [i.idProducto, Number(i.stockActual || 0)])
          );
          const nameMap = new Map(
            inventarios.map((i) => [
              i.idProducto,
              i.producto?.nombre ?? i.idProducto,
            ])
          );

          // Si falta inventario para algún producto, avisa con el nombre
          for (const it of data.productos!) {
            const nombre = nameMap.get(it.productoId) ?? it.productoId;
            if (!stockMap.has(it.productoId)) {
              throw new BadRequestException(
                `No existe inventario configurado para el producto "${nombre}".`
              );
            }
            const disp = stockMap.get(it.productoId)!;
            if (disp < it.cantidad) {
              throw new BadRequestException(
                `Stock insuficiente para el producto "${nombre}". Disponible: ${disp}, requerido: ${it.cantidad}`
              );
            }
          }

          // Descuento atómico por línea + movimientos
          for (const it of data.productos!) {
            const nombre = nameMap.get(it.productoId) ?? it.productoId;

            const ok = await tx.inventario.updateMany({
              where: {
                idEmpresa: empresaId,
                idProducto: it.productoId,
                stockActual: { gte: it.cantidad }, // check + decrement en un paso
              },
              data: { stockActual: { decrement: it.cantidad } },
            });

            if (ok.count === 0) {
              throw new BadRequestException(
                `El stock de "${nombre}" cambió durante la operación. Intenta de nuevo.`
              );
            }
            const clienteIdEfectivo = data.clienteId ?? pedidoPrevio.clienteId;
            const clienteObs = await tx.cliente.findUnique({
              where: { id: clienteIdEfectivo },
              select: { rasonZocial: true, nombre: true, apellidos: true },
            });

            const clienteNombre =
              (clienteObs?.rasonZocial?.trim()?.length
                ? clienteObs.rasonZocial.trim()
                : `${clienteObs?.nombre ?? ''} ${clienteObs?.apellidos ?? ''}`.trim()) ||
              'Cliente';

            await tx.movimientoInventario.create({
              data: {
                idEmpresa: empresaId,
                idProducto: it.productoId,
                cantidadMovimiendo: it.cantidad,
                idTipoMovimiento: tipoSalida.idTipoMovimiento,
                IdUsuario: usuarioId,
                IdPedido: pedidoId, ///////////////////////////////////////////////////////////////
                observacion: `Venta por pedido ${pedidoId.slice(0, 6)} - Cliente: ${clienteNombre}`,
              },
            });
          }

          // Cartera por el total recalculado
          await tx.movimientosCartera.create({
            data: {
              idCliente: pedidoPrevio.clienteId,
              idUsuario: pedidoPrevio.usuarioId,
              empresaId,
              valorMovimiento: totalCalculado,
              idPedido: pedidoId,
              tipoMovimientoOrigen: 'PEDIDO',
            },
          });
        }

        return { estadoPrevio };
      },
      { timeout: 20000, maxWait: 10000 }
    );

    // PDF + correo (fuera de la tx)
    setImmediate(() => {
      void (async () => {
        try {
          const pedidoParaPdf = await this.prisma.pedido.findUnique({
            where: { id: pedidoId },
            include: {
              productos: {
                include: { producto: true },
                orderBy: { producto: { nombre: 'asc' } },
              },
              cliente: true,
              usuario: { select: { nombre: true, telefono: true } },
              empresa: true,
              estados: { orderBy: { fechaEstado: 'desc' } },
            },
          });
          if (!pedidoParaPdf) return;

          const url = await this.generarYSubirPDFPedido(pedidoParaPdf as any);

          if (
            ['FACTURADO', 'ENVIADO'].includes(estadoPrevio) &&
            pedidoParaPdf.cliente?.email
          ) {
            const numeroWhatsApp = `+57${pedidoParaPdf.usuario?.telefono?.replace(/\D/g, '')}`;
            await this.resend.enviarCorreo(
              pedidoParaPdf.cliente.email,
              'Actualización de tu pedido',
              `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
              <p>Hola <strong>${pedidoParaPdf.cliente.nombre}</strong>,</p>
              <p>Tu pedido ha sido actualizado y sigue en estado <strong>${estadoPrevio}</strong>. Adjuntamos el comprobante en PDF:</p>
              <p style="margin:16px 0;">
                <a href="${url}?t=${Date.now()}" target="_blank"
                  style="display:inline-block;padding:10px 20px;background-color:#4F46E5;color:#fff;text-decoration:none;border-radius:6px;">
                  Ver Comprobante PDF
                </a>
              </p>
              <p>¿Dudas? <a href="https://wa.me/${numeroWhatsApp}" target="_blank">Escríbenos por WhatsApp</a>.</p>
            </div>`
            );
          }
        } catch (err) {
          console.error('Error generando/enviando PDF tras update:', err);
        }
      })();
    });

    // Respuesta al front
    const pedidoFinal = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        productos: {
          include: { producto: true },
          orderBy: { producto: { nombre: 'asc' } },
        },
        cliente: true,
        usuario: { select: { nombre: true, telefono: true } },
        empresa: true,
        estados: { orderBy: { fechaEstado: 'desc' } },
      },
    });
    return pedidoFinal!;
  }

  ///actualizar guia y flete

  async actualizarEnvio(
    pedidoId: string,
    data: UpdateEnvioDto, // debe incluir guiaTransporte?: string|null; flete?: number|null
    usuario: UsuarioPayload
  ) {
    const { rol, empresaId } = usuario;

    // 1) Permisos
    if (rol !== 'admin' && rol !== 'bodega') {
      throw new UnauthorizedException('No está autorizado');
    }

    // 3) Cargar pedido y validar estado actual
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId, empresaId },
      select: {
        id: true,
        estados: {
          select: { estado: true, fechaEstado: true },
          orderBy: { fechaEstado: 'desc' },
          take: 1,
        },
      },
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');

    const estadoActual = pedido.estados[0]?.estado ?? 'GENERADO';
    if (estadoActual !== 'ENVIADO') {
      throw new BadRequestException(
        'Solo se puede editar guía y flete cuando el pedido está ENVIADO.'
      );
    }

    // 5) Actualizar y devolver (incluye lo que necesites)
    return this.prisma.pedido.update({
      where: { id: pedidoId },
      data: { flete: data.flete, guiaTransporte: data.guiaTransporte },
      include: {
        cliente: true,
        usuario: true,
        estados: true,
        productos: { include: { producto: true } },
      },
    });
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

  async asignarComisionVendedor(
    pedidoId: string,
    comision: number,
    usuario: UsuarioPayload
  ) {
    if (!usuario) throw new BadRequestException('El usuario es requerido');
    const { empresaId, rol } = usuario; // Desestructurar rol del usuario

    // Solo admin puede asignar comisiones
    if (rol !== 'admin') {
      throw new UnauthorizedException('No está autorizado');
    }

    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId, empresaId },
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    const pedidoActualizado = await this.prisma.pedido.update({
      where: { id: pedidoId },
      data: { comisionVendedor: comision },
    });
    return pedidoActualizado;
  }
}
