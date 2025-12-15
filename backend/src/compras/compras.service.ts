import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { UpdateCompraDto } from './dto/update-compra.dto';
import { PdfUploaderService } from 'src/pdf-uploader/pdf-uploader.service';
import { ResumenCompraDto } from './dto/resumen-compra.dto';

@Injectable()
export class ComprasService {
  constructor(
    private prisma: PrismaService,
    private pdfUploaderService: PdfUploaderService
  ) {}

  /**
   * Crea una compra + su detalle + actualiza/inicializa Inventario.
   */
  // Dentro de ComprasService (privado)
  private async computeRecepcion(
    tx: PrismaService, // o Prisma.TransactionClient si prefieres tipar
    params: { idCompra: string; empresaId: string }
  ): Promise<{
    estado: 'PENDIENTE' | 'PARCIAL' | 'RECIBIDA' | 'INCONSISTENTE';
    recibida: boolean;
    porProducto: Record<string, number>;
  }> {
    const { idCompra, empresaId } = params;

    const tipoEntrada = await tx.tipoMovimientos.findFirst({
      where: { tipo: 'ENTRADA' },
      select: { idTipoMovimiento: true },
    });
    if (!tipoEntrada)
      return { estado: 'PENDIENTE', recibida: false, porProducto: {} };

    const detalles = await tx.detalleCompra.findMany({
      where: { idCompra },
      select: { idProducto: true, cantidad: true },
    });
    if (detalles.length === 0) {
      return { estado: 'PENDIENTE', recibida: false, porProducto: {} };
    }

    // Sumatoria por producto de movimientos ENTRADA de esa compra
    const entradas = await tx.movimientoInventario.groupBy({
      by: ['idProducto'],
      where: {
        idCompra,
        idEmpresa: empresaId,
        idTipoMovimiento: tipoEntrada.idTipoMovimiento,
      },
      _sum: { cantidadMovimiendo: true },
    });

    const recMap = new Map<string, number>(
      entradas.map((e) => [
        e.idProducto,
        Number(e._sum.cantidadMovimiendo ?? 0),
      ])
    );

    const EPS = 1e-6;
    let todoCero = true;
    let todoIgual = true;

    for (const d of detalles) {
      const rec = recMap.get(d.idProducto) ?? 0;
      if (rec > EPS) todoCero = false;
      if (rec > d.cantidad + EPS) {
        return {
          estado: 'INCONSISTENTE',
          recibida: false,
          porProducto: Object.fromEntries(recMap),
        };
      }
      if (Math.abs(rec - d.cantidad) > EPS) {
        todoIgual = false;
      }
    }

    if (todoIgual && !todoCero) {
      return {
        estado: 'RECIBIDA',
        recibida: true,
        porProducto: Object.fromEntries(recMap),
      };
    }
    if (todoCero) {
      return {
        estado: 'PENDIENTE',
        recibida: false,
        porProducto: Object.fromEntries(recMap),
      };
    }
    return {
      estado: 'PARCIAL',
      recibida: false,
      porProducto: Object.fromEntries(recMap),
    };
  }

  async create(usuario: UsuarioPayload, data: CreateCompraDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Crear la cabecera de la compra
        const nuevaCompra = await tx.compras.create({
          data: {
            proveedor: { connect: { idProveedor: data.idProveedor } },
            empresa: { connect: { id: usuario.empresaId } },
          },
        });

        // 2. Crear el detalle para cada producto
        for (const item of data.ProductosCompras) {
          // b) Crear el detalle de compra
          await tx.detalleCompra.create({
            data: {
              idCompra: nuevaCompra.idCompra,
              idProducto: item.idProducto,
              cantidad: item.cantidad,
              precioUnitario: item.precio, // 👈 si tienes este campo en detalleCompra
            },
          });
        }

        // 3. Calcular total de la compra
        const totalCompra = data.ProductosCompras.reduce(
          (sum, item) => sum + item.cantidad * item.precio,
          0
        );

        return {
          ...nuevaCompra,
          total: totalCompra,
          cantidadItems: data.ProductosCompras.length,
          productosActualizados: data.ProductosCompras.length,
          estado: 'PENDIENTE', // 👈 opcional si manejas el estado desde frontend o por lógica
        };
      });
    } catch (error: any) {
      console.error('Error en transacción de compra:', error);
      throw new Error('Error al crear la compra');
    }
  }

  async recibir(idCompra: string, usuario: UsuarioPayload) {
    const { empresaId } = usuario;

    return await this.prisma.$transaction(async (tx) => {
      // 1. Verificar si ya fue recibida (tiene movimientos tipo ENTRADA)
      const tipoEntrada = await tx.tipoMovimientos.findFirst({
        where: { tipo: 'ENTRADA' },
      });

      if (!tipoEntrada) {
        throw new BadRequestException(
          'Tipo de movimiento ENTRADA no configurado'
        );
      }

      const yaRecibida = await tx.movimientoInventario.findFirst({
        where: {
          idCompra,
          idTipoMovimiento: tipoEntrada.idTipoMovimiento,
        },
      });

      if (yaRecibida) {
        throw new BadRequestException('Esta compra ya fue recibida.');
      }

      // 2. Obtener los detalles de la compra
      const detallesCompra = await tx.detalleCompra.findMany({
        where: {
          idCompra,
        },
        include: {
          producto: true, // traer precioCompra si lo necesitas
          compra: {
            select: {
              proveedor: {
                select: { razonsocial: true },
              },
              idCompra: true,
            },
          },
        },
      });

      // 3. Procesar cada producto
      for (const detalle of detallesCompra) {
        // a) Actualizar o crear inventario

        // a) Actualizar el precio de compra del producto
        await tx.producto.update({
          where: { id: detalle.idProducto },
          data: {
            ...(detalle.precioUnitario != null
              ? { precioCompra: Number(detalle.precioUnitario) } // Float
              : {}), // si es null/undefined, no enviar el campo
          },
        });

        const inv = await tx.inventario.findFirst({
          where: {
            idProducto: detalle.idProducto,
            idEmpresa: empresaId,
          },
        });

        if (inv) {
          await tx.inventario.update({
            where: { idInventario: inv.idInventario },
            data: {
              stockReferenciaOinicial: inv.stockActual + detalle.cantidad,
              stockActual: {
                increment: detalle.cantidad,
              },
            },
          });
        } else {
          await tx.inventario.create({
            data: {
              idProducto: detalle.idProducto,
              idEmpresa: empresaId,
              stockReferenciaOinicial: detalle.cantidad,
              stockActual: detalle.cantidad,
            },
          });
        }

        // b) Crear movimiento de inventario tipo ENTRADA
        await tx.movimientoInventario.create({
          data: {
            IdUsuario: usuario.id,
            idProducto: detalle.idProducto,
            idEmpresa: usuario.empresaId,
            cantidadMovimiendo: detalle.cantidad,
            idTipoMovimiento: tipoEntrada.idTipoMovimiento,
            idCompra: idCompra,
            observacion: `Compra # ${detalle.compra.idCompra.slice(0, 5)}-Proveedor:${detalle.compra.proveedor.razonsocial} `,
          },
        });

        await tx.compras.update({
          where: { idCompra },
          data: { recibido: true }, // marcar como recibida
        });
      }

      return {
        mensaje: 'Compra recibida correctamente.',
        cantidadProductos: detallesCompra.length,
      };
    });
  }

  /**
   * Actualiza una compra existente:
   * - Borra todos sus detalleCompra y movimientosInventario anteriores
   * - Inserta de nuevo los detalleCompra según el array enviado
   * - Ajusta el inventario y crea nuevos movimientos de inventario ENTRADA
   */
  async updateCompra(
    compraId: string,
    usuario: UsuarioPayload,
    data: UpdateCompraDto
  ) {
    const compraExistente = await this.prisma.compras.findUnique({
      where: { idCompra: compraId, idEmpresa: usuario.empresaId },
      select: { idCompra: true },
    });
    if (!compraExistente) throw new BadRequestException('Compra no encontrada');

    if (!data.ProductosCompras || data.ProductosCompras.length === 0) {
      throw new BadRequestException(
        'La compra debe tener al menos un producto'
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const yaRecibida =
          (await tx.movimientoInventario.count({
            where: { idCompra: compraId, idEmpresa: usuario.empresaId },
          })) > 0;

        // 1) Detalles antiguos (para revertir inventario si ya estaba recibida)
        const detallesAntiguos = await tx.detalleCompra.findMany({
          where: { idCompra: compraId },
          select: { idProducto: true, cantidad: true },
        });

        // 2) Borrar detalle y recrear con precio pactado (SIEMPRE)
        await tx.detalleCompra.deleteMany({ where: { idCompra: compraId } });

        for (const item of data.ProductosCompras) {
          await tx.detalleCompra.create({
            data: {
              idCompra: compraId,
              idProducto: item.idProducto,
              cantidad: item.cantidad,
              precioUnitario: item.precio, // ✅ GUARDA PRECIO PACTADO
            },
          });
        }

        // ✅ Si NO está recibida: terminamos acá.
        //    (No toques producto.precioCompra, no inventario, no movimientos)
        if (!yaRecibida) {
          const compraActualizada = await tx.compras.findUnique({
            where: { idCompra: compraId },
            include: {
              detalleCompra: {
                include: {
                  producto: { select: { id: true, nombre: true } },
                },
              },
              proveedor: { select: { razonsocial: true } },
            },
          });

          const productos = (compraActualizada?.detalleCompra ?? []).map(
            (d) => {
              const precio = Number(d.precioUnitario ?? 0);
              return {
                id: d.producto.id,
                nombre: d.producto.nombre,
                cantidad: d.cantidad,
                precioUnitario: precio,
                subtotal: d.cantidad * precio,
              };
            }
          );

          const totalCompra = productos.reduce((sum, p) => sum + p.subtotal, 0);

          return {
            ...compraActualizada,
            total: totalCompra,
            cantidadItems: data.ProductosCompras.length,
            productos,
            reaplicoInventario: false,
          };
        }

        // 3) Si ya estaba recibida: revertir inventario anterior
        for (const ant of detallesAntiguos) {
          await tx.inventario.updateMany({
            where: { idProducto: ant.idProducto, idEmpresa: usuario.empresaId },
            data: {
              stockActual: { decrement: ant.cantidad },
              stockReferenciaOinicial: { decrement: ant.cantidad },
            },
          });
        }

        // 4) Borrar movimientos anteriores de la compra
        await tx.movimientoInventario.deleteMany({
          where: { idCompra: compraId, idEmpresa: usuario.empresaId },
        });

        // 5) Tipo ENTRADA
        const tipoEntrada = await tx.tipoMovimientos.findFirst({
          where: { tipo: 'ENTRADA' },
          select: { idTipoMovimiento: true },
        });
        if (!tipoEntrada) {
          throw new BadRequestException(
            'Tipo de movimiento ENTRADA no configurado'
          );
        }

        // 6) Re-aplicar inventario y movimientos con el NUEVO detalle
        for (const item of data.ProductosCompras) {
          const inv = await tx.inventario.findFirst({
            where: {
              idProducto: item.idProducto,
              idEmpresa: usuario.empresaId,
            },
          });

          // ✅ Ahora SÍ actualizamos el precio vigente porque la compra está recibida
          if (typeof item.precio === 'number') {
            await tx.producto.update({
              where: { id: item.idProducto },
              data: { precioCompra: item.precio },
            });
          }

          if (inv) {
            await tx.inventario.update({
              where: { idInventario: inv.idInventario },
              data: {
                stockActual: { increment: item.cantidad },
                stockReferenciaOinicial: { increment: item.cantidad },
              },
            });
          } else {
            await tx.inventario.create({
              data: {
                idProducto: item.idProducto,
                idEmpresa: usuario.empresaId,
                stockActual: item.cantidad,
                stockReferenciaOinicial: item.cantidad,
              },
            });
          }

          await tx.movimientoInventario.create({
            data: {
              IdUsuario: usuario.id,
              idProducto: item.idProducto,
              idEmpresa: usuario.empresaId,
              cantidadMovimiendo: item.cantidad,
              idTipoMovimiento: tipoEntrada.idTipoMovimiento,
              idCompra: compraId,
              observacion: `Ajuste por edición de compra recibida por ${usuario.nombre}`,
            },
          });
        }

        const compraActualizada = await tx.compras.findUnique({
          where: { idCompra: compraId },
          include: {
            detalleCompra: {
              include: {
                producto: {
                  select: { id: true, nombre: true, precioCompra: true },
                },
              },
            },
            proveedor: { select: { razonsocial: true } },
          },
        });

        // devuelve usando precioUnitario (lo pactado) para que siempre cuadre
        const productos = (compraActualizada?.detalleCompra ?? []).map((d) => {
          const precio = Number(
            d.precioUnitario ?? d.producto.precioCompra ?? 0
          );
          return {
            id: d.producto.id,
            nombre: d.producto.nombre,
            cantidad: d.cantidad,
            precioUnitario: precio,
            subtotal: d.cantidad * precio,
          };
        });

        const totalCompra = productos.reduce((sum, p) => sum + p.subtotal, 0);

        return {
          ...compraActualizada,
          total: totalCompra,
          cantidadItems: data.ProductosCompras.length,
          productos,
          reaplicoInventario: true,
        };
      });
    } catch (error) {
      console.error('Error en transacción de compra:', error);
      throw new Error('Error al actualizar la compra');
    }
  }

  // Obtener todas las compras de una empresa
  async findAll(usuario: UsuarioPayload) {
    // 1) Hacemos el findMany sobre detalleCompra,
    //    filtrando por empresaId de la compra
    const detalles = await this.prisma.detalleCompra.findMany({
      where: {
        compra: {
          empresa: {
            id: usuario.empresaId,
          },
        },
      },
      select: {
        precioUnitario: true,
        cantidad: true,
        producto: {
          select: { nombre: true, id: true, precioCompra: true },
        },
        compra: {
          select: {
            idCompra: true,
            proveedor: { select: { razonsocial: true } },
            FechaCompra: true,
            movimientosInventario: {
              // 2) preguntamos sólo los movimientos de tipo ENTRADA
              //    y para este producto en concreto
              where: {
                idTipoMovimiento: {
                  // si tienes un enum, podrías filtrar aquí sólo ENTRADA
                  // o lo omites si no te importa traer también SALIDA
                  equals:
                    (
                      await this.prisma.tipoMovimientos.findFirst({
                        where: { tipo: 'ENTRADA' },
                      })
                    )?.idTipoMovimiento ?? undefined,
                },
                // igualamos idProducto a este detalleCompra
                // Prisma infiere que `this` es el campo `producto`,
                // pero lo más explícito es:
                // idProducto: { equals: /* mismo idProducto */ }
              },
            },
          },
        },
      },
    });

    // 2) Agrupamos por idCompra
    interface Group {
      idCompra: string;
      proveedor: string;
      FechaCompra: Date;

      productos: Array<{
        id: string;
        nombre: string;
        cantidad: number;
        precioCompra: number;
      }>;
    }

    const agrupado: Record<string, Group> = {};

    detalles.forEach((dc) => {
      const key = dc.compra.idCompra;
      if (!agrupado[key]) {
        agrupado[key] = {
          idCompra: key,
          proveedor: dc.compra.proveedor.razonsocial,
          FechaCompra: dc.compra.FechaCompra,

          productos: [],
        };
      }
      agrupado[key].productos.push({
        id: dc.producto.id,
        nombre: dc.producto.nombre,
        cantidad: dc.cantidad,
        precioCompra: Number(
          dc.precioUnitario ?? dc.producto.precioCompra ?? 0
        ), // ✅ precio pactado
      });
    });

    // 3) Transformamos a array, calculando totalCompra
    const resultado = Object.values(agrupado).map((compra) => {
      const totalCompra = compra.productos.reduce(
        (sum, p) => sum + p.cantidad * p.precioCompra,
        0
      );

      return {
        idCompra: compra.idCompra,
        proveedor: compra.proveedor,
        FechaCompra: compra.FechaCompra,
        totalCompra,
        productos: compra.productos,
      };
    });
    // 4) Ordenamos el array final por FechaCompra desc
    return resultado.sort(
      (a, b) => b.FechaCompra.getTime() - a.FechaCompra.getTime()
    );
  }

  // Obtener una compra por su ID
  async findById(idCompra: string, usuario: UsuarioPayload) {
    const TipoEntrada = await this.prisma.tipoMovimientos.findFirst({
      where: { tipo: 'ENTRADA' },
    });

    const detalle = await this.prisma.detalleCompra.findMany({
      where: {
        idCompra: idCompra,
        compra: { idEmpresa: usuario.empresaId },
      },
      select: {
        precioUnitario: true,
        cantidad: true,
        producto: {
          select: {
            nombre: true,
            id: true,
            precioCompra: true,
            precioVenta: true,
          },
        },
        compra: {
          select: {
            idCompra: true,
            FechaCompra: true,
            // 👇 MANTENGO tu select de movimientos por si lo usas en el front
            movimientosInventario: {
              where: { idTipoMovimiento: TipoEntrada?.idTipoMovimiento },
              select: { cantidadMovimiendo: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!detalle || detalle.length === 0) {
      throw new BadRequestException(`Compra ${idCompra} no encontrada.`);
    }

    // 👉 Cálculo de entradas por producto (NO cambia tu esquema)
    const entradas = await this.prisma.movimientoInventario.groupBy({
      by: ['idProducto'],
      where: {
        idCompra,
        idEmpresa: usuario.empresaId,
        idTipoMovimiento: TipoEntrada?.idTipoMovimiento,
      },
      _sum: { cantidadMovimiendo: true },
    });

    const recibidoPorProducto = new Map<string, number>(
      entradas.map((e) => [
        e.idProducto,
        Number(e._sum.cantidadMovimiendo ?? 0),
      ])
    );

    // 👉 Derivar estado de recepción (PENDIENTE | PARCIAL | RECIBIDA | INCONSISTENTE)
    let estado: 'PENDIENTE' | 'PARCIAL' | 'RECIBIDA' | 'INCONSISTENTE' =
      'PENDIENTE';
    let todoCero = true;
    let todoIgual = true;

    for (const dc of detalle) {
      const rec = recibidoPorProducto.get(dc.producto.id) ?? 0;
      if (rec > 0) todoCero = false;
      if (rec > dc.cantidad) {
        estado = 'INCONSISTENTE';
        break;
      }
      if (rec !== dc.cantidad) todoIgual = false;
    }
    if (estado !== 'INCONSISTENTE') {
      if (todoIgual && !todoCero) estado = 'RECIBIDA';
      else if (!todoCero) estado = 'PARCIAL';
      else estado = 'PENDIENTE';
    }

    const first = detalle[0].compra;

    // 🔥 CALCULAR TOTALES + agregar cantidadRecibida por producto (sin quitar tu cantidadMovimiendo)
    const productos = detalle.map((dc) => {
      const precioUnitario = Number(
        dc.precioUnitario ?? dc.producto.precioCompra ?? 0
      ); // ✅
      const subtotal = dc.cantidad * precioUnitario;

      return {
        id: dc.producto.id,
        nombre: dc.producto.nombre,
        cantidad: dc.cantidad,
        precio: precioUnitario,
        subtotal,
        cantidadMovimiendo:
          dc.compra.movimientosInventario[0]?.cantidadMovimiendo ?? 0,
        cantidadRecibida: recibidoPorProducto.get(dc.producto.id) ?? 0,
      };
    });

    const totalCompra = productos.reduce((sum, prod) => sum + prod.subtotal, 0);
    const totalUnidades = productos.reduce(
      (sum, prod) => sum + prod.cantidad,
      0
    );

    // 👉 NUEVO: recepcion (no rompe nada existente)
    const recepcion = {
      estado,
      recibida: estado === 'RECIBIDA',
      porProducto: Object.fromEntries(recibidoPorProducto),
    };

    return {
      idCompra: first.idCompra,
      FechaCompra: first.FechaCompra,
      productos,
      resumen: {
        cantidadProductos: productos.length,
        totalUnidades,
        totalCompra,
      },
      recepcion, // 👈 añadido
    };
  }

  async generarPdfCompra(
    idCompra: string,
    usuario: UsuarioPayload
  ): Promise<Buffer> {
    if (!usuario) throw new BadRequestException('No permitido');
    const { empresaId, rol } = usuario;

    if (rol !== 'admin') {
      throw new UnauthorizedException('Usuario no autorizado');
    }

    // Obtiene la compra con sus productos asociados
    const compra = await this.prisma.compras.findUnique({
      where: {
        idCompra,
        idEmpresa: empresaId,
      },
      include: {
        detalleCompra: {
          include: {
            producto: {
              include: {
                categoria: {
                  select: { nombre: true },
                },
              },
            },
          },
        },
      },
    });

    if (!compra || !compra.detalleCompra.length) {
      throw new BadRequestException('La compra no existe o no tiene productos');
    }

    const productos = await this.prisma.detalleCompra.findMany({
      where: { idCompra },
      include: {
        producto: {
          include: {
            categoria: true,
          },
        },
      },
    });

    type CatalogoProducto = {
      nombre: string;
      imagenUrl: string;
      precioVenta: number;
      stockDisponible: number;
      categoria?: { nombre: string };
    };

    // ✅ Tipar explícitamente cada elemento
    const productosFormateados: CatalogoProducto[] = productos.map(
      (p): CatalogoProducto => ({
        nombre: p.producto.nombre,
        imagenUrl: p.producto.imagenUrl ?? '',
        precioVenta: p.producto.precioVenta ?? 0,
        stockDisponible: p.cantidad,
        categoria: p.producto.categoria
          ? { nombre: p.producto.categoria.nombre }
          : undefined,
      })
    );

    // Genera el PDF (ajusta tu servicio para aceptar este nuevo formato si es necesario)
    const { buffer } =
      await this.pdfUploaderService.generarCatalogoPDF(productosFormateados);

    return buffer;
  }

  // compras.service.ts
  async generarPDFCompraSencilla(
    idCompra: string,
    usuario: UsuarioPayload
  ): Promise<Buffer> {
    if (!usuario) throw new BadRequestException('No permitido');
    const { empresaId, rol } = usuario;
    if (rol !== 'admin')
      throw new UnauthorizedException('Usuario no autorizado');

    const compra = await this.prisma.compras.findUnique({
      where: { idCompra, idEmpresa: empresaId },
      include: {
        empresa: true,
        proveedor: true,
        detalleCompra: { include: { producto: true } },
      },
    });

    if (!compra || !compra.detalleCompra.length) {
      throw new BadRequestException('La compra no existe o no tiene productos');
    }

    const items = compra.detalleCompra.map((dc) => {
      const cantidad = Number(dc.cantidad ?? 0);
      const costoUnitario = Number(dc.producto?.precioCompra ?? 0);
      const idShort = dc.producto?.id
        ? dc.producto.id.replace(/-/g, '').slice(0, 5).toUpperCase()
        : null;

      return {
        nombre: dc.producto?.nombre ?? 'Producto',
        codigo: idShort, // 👈 ahora el template usa it.codigo
        cantidad,
        costoUnitario,
        subtotal: cantidad * costoUnitario,
      };
    });
    const total = items.reduce((a, b) => a + b.subtotal, 0);

    const resumen: ResumenCompraDto = {
      logoUrl: compra.empresa?.logoUrl ?? '',
      nombreEmpresa:
        compra.empresa?.nombreComercial || compra.empresa?.razonSocial || '',
      direccionEmpresa: compra.empresa?.direccion ?? '',
      telefonoEmpresa: compra.empresa?.telefono ?? '',
      idCompra: compra.idCompra,
      fechaCompra: compra.FechaCompra,
      proveedorNombre: compra.proveedor?.razonsocial ?? '',
      proveedorIdentificacion: compra.proveedor?.identificacion ?? '',
      proveedorTelefono: compra.proveedor?.telefono ?? '',
      proveedorDireccion: compra.proveedor?.direccion ?? '',
      items,
      total,
    };

    const { buffer } = await this.pdfUploaderService.generarCompraPDF(resumen);

    return buffer; // ← listo
  }
}
