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

@Injectable()
export class ComprasService {
  constructor(
    private prisma: PrismaService,
    private pdfUploaderService: PdfUploaderService
  ) {}

  /**
   * Crea una compra + su detalle + actualiza/inicializa Inventario.
   */
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
          // a) Actualizar el precio de compra del producto
          await tx.producto.update({
            where: { id: item.idProducto },
            data: {
              precioCompra: item.precio, // 🔁 Actualiza el precio base del producto
            },
          });

          // b) Crear el detalle de compra
          await tx.detalleCompra.create({
            data: {
              idCompra: nuevaCompra.idCompra,
              idProducto: item.idProducto,
              cantidad: item.cantidad,
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
        },
      });

      // 3. Procesar cada producto
      for (const detalle of detallesCompra) {
        // a) Actualizar o crear inventario
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
            observacion: `Compra recibida por ${usuario.nombre}.`,
          },
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
    // Verificamos que la compra exista
    const compraExistente = await this.prisma.compras.findUnique({
      where: { idCompra: compraId },
    });

    if (!compraExistente) {
      throw new Error('Compra no encontrada');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. PRIMERO obtenemos los productos antes de borrar los detalles
        const productosEliminados = await tx.detalleCompra.findMany({
          where: { idCompra: compraId },
          select: { idProducto: true, cantidad: true },
        });

        // 2. Borrar los detalles de la compra
        await tx.detalleCompra.deleteMany({
          where: { idCompra: compraId },
        });

        // 3. Borrar los movimientos de inventario asociados a la compra
        await tx.movimientoInventario.deleteMany({
          where: { idCompra: compraId },
        });

        // 4. Reducir el inventario de los productos eliminados
        if (productosEliminados.length > 0) {
          for (const producto of productosEliminados) {
            await tx.inventario.updateMany({
              where: {
                idProducto: producto.idProducto,
                idEmpresa: usuario.empresaId,
              },
              data: {
                stockActual: {
                  decrement: producto.cantidad,
                },
                stockReferenciaOinicial: {
                  decrement: producto.cantidad,
                },
              },
            });
          }
        }

        // 5. Obtener el tipo de movimiento
        const tipoMov = await tx.tipoMovimientos.findFirst({
          where: { tipo: 'ENTRADA' },
        });
        if (!tipoMov) {
          throw new Error('Tipo de movimiento no encontrado');
        }

        // 6. Crear nuevamente cada línea en detalleCompra y los movimientos de inventario
        for (const item of data.ProductosCompras || []) {
          // 🔥 ACTUALIZAR EL PRECIO DE COMPRA DEL PRODUCTO
          await tx.producto.update({
            where: { id: item.idProducto },
            data: {
              precioCompra: item.precio, // 👈 ACTUALIZAR PRECIO BASE DEL PRODUCTO
            },
          });

          // Crear el detalle de la compra (sin precio, ya que se actualiza en el producto)
          await tx.detalleCompra.create({
            data: {
              idCompra: compraId,
              idProducto: item.idProducto,
              cantidad: item.cantidad,
              // No guardamos precio aquí porque se actualiza en el producto
            },
          });

          // Actualizar o crear el inventario del producto
          const inv = await tx.inventario.findFirst({
            where: {
              idProducto: item.idProducto,
              idEmpresa: usuario.empresaId,
            },
          });

          if (inv) {
            await tx.inventario.update({
              where: { idInventario: inv.idInventario },
              data: {
                stockActual: {
                  increment: item.cantidad,
                },
                stockReferenciaOinicial: {
                  increment: item.cantidad,
                },
              },
            });
          } else {
            await tx.inventario.create({
              data: {
                idProducto: item.idProducto,
                idEmpresa: usuario.empresaId,
                stockReferenciaOinicial: item.cantidad,
                stockActual: item.cantidad,
              },
            });
          }

          // Crear el movimiento de inventario de tipo ENTRADA
          await tx.movimientoInventario.create({
            data: {
              IdUsuario: usuario.id,
              idProducto: item.idProducto,
              idEmpresa: usuario.empresaId,
              cantidadMovimiendo: item.cantidad,
              idTipoMovimiento: tipoMov.idTipoMovimiento,
              idCompra: compraId,
              observacion: `Compra actualizada por ${usuario.nombre}. Precio actualizado a $${item.precio}`, // 👈 OBSERVACIÓN MEJORADA
            },
          });
        }

        // 7. Retornar la compra actualizada con información del total
        const compraActualizada = await tx.compras.findUnique({
          where: { idCompra: compraId },
          include: { detalleCompra: true },
        });

        // 8. Calcular total actualizado
        const totalCompra = (data.ProductosCompras || []).reduce(
          (sum, item) => sum + item.cantidad * item.precio,
          0
        );

        return {
          ...compraActualizada,
          total: totalCompra,
          cantidadItems: data.ProductosCompras?.length || 0,
          productosActualizados: data.ProductosCompras?.length || 0,
        };
      });
    } catch (error: any) {
      console.error('Error en transacción de compra:', error);
      throw new Error('Error al actualizar la compra y precios de productos');
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
        precioCompra: dc.producto.precioCompra,
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
        compra: {
          idEmpresa: usuario.empresaId,
        },
      },
      select: {
        cantidad: true,
        producto: {
          select: {
            nombre: true,
            id: true,
            precioCompra: true, // 👈 AGREGAR PRECIO DE COMPRA DEL PRODUCTO
            precioVenta: true, // 👈 OPCIONAL: precio de venta también
          },
        },
        compra: {
          select: {
            idCompra: true,
            FechaCompra: true,
            movimientosInventario: {
              where: {
                idTipoMovimiento: TipoEntrada?.idTipoMovimiento,
              },
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

    // Agrupamos por idCompra
    const first = detalle[0].compra;

    // 🔥 CALCULAR TOTALES
    const productos = detalle.map((dc) => {
      // Usar precio del detalle si existe, sino el precioCompra del producto
      const precioUnitario = dc.producto.precioCompra || 0;
      const subtotal = dc.cantidad * precioUnitario;

      return {
        id: dc.producto.id,
        nombre: dc.producto.nombre,
        cantidad: dc.cantidad,
        precio: precioUnitario, // 👈 PRECIO UNITARIO
        subtotal: subtotal, // 👈 SUBTOTAL CALCULADO
        cantidadMovimiendo:
          dc.compra.movimientosInventario[0]?.cantidadMovimiendo ?? 0,
      };
    });

    // 🔥 CALCULAR TOTAL GENERAL
    const totalCompra = productos.reduce((sum, prod) => sum + prod.subtotal, 0);
    const totalUnidades = productos.reduce(
      (sum, prod) => sum + prod.cantidad,
      0
    );

    const resultado = {
      idCompra: first.idCompra,
      FechaCompra: first.FechaCompra,
      productos: productos,
      // 👈 AGREGAR TOTALES AL RESULTADO
      resumen: {
        cantidadProductos: productos.length,
        totalUnidades: totalUnidades,
        totalCompra: totalCompra,
      },
    };

    return resultado;
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
}
