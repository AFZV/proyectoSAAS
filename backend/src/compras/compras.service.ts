import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { UpdateCompraDto } from './dto/update-compra.dto';

@Injectable()
export class ComprasService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crea una compra + su detalle + actualiza/inicializa Inventario.
   */
  async create(usuario: UsuarioPayload, data: CreateCompraDto) {
    // Abrimos una transacción para que todo se ejecute de forma atómica
    try {
      return await this.prisma.$transaction(async (tx) => {
        //1 Creamos la cabecera de la compra
        const nuevaCompra = await tx.compras.create({
          data: {
            proveedor: { connect: { idProveedor: data.idProveedor } },
            empresa: { connect: { id: usuario.empresaId } },
          },
        });
        //crear el detalle para cada producto en  la compra
        for (const item of data.ProductosCompras) {
          await tx.detalleCompra.create({
            data: {
              idCompra: nuevaCompra.idCompra,
              idProducto: item.idProducto,
              cantidad: item.cantidad,
            },
          });

          //3Actualizar o crear el inventario del producto
          const inv = await tx.inventario.findFirst({
            where: {
              idProducto: item.idProducto,
              idEmpresa: usuario.empresaId,
            },
          });

          if (inv) {
            //Si ya existe el inventario, sumamos la cantidad
            await tx.inventario.update({
              where: { idInventario: inv.idInventario },
              data: {
                stockReferenciaOinicial: inv.stockActual + item.cantidad,
                stockActual: {
                  increment: item.cantidad,
                },
              },
            });
          } else {
            //Si no existe, creamos el registro de inventario
            await tx.inventario.create({
              data: {
                idProducto: item.idProducto,
                idEmpresa: usuario.empresaId,
                stockReferenciaOinicial: item.cantidad,
                stockActual: item.cantidad,
              },
            });
          }
          const tipoMovimiento = await tx.tipoMovimientos.findFirst({
            where: {
              tipo: 'ENTRADA',
            },
          });
          if (tipoMovimiento) {
            await tx.movimientoInventario.create({
              data: {
                IdUsuario: usuario.id,
                idProducto: item.idProducto,
                idEmpresa: usuario.empresaId,
                cantidadMovimiendo: item.cantidad,
                idTipoMovimiento: tipoMovimiento.idTipoMovimiento,
                idCompra: nuevaCompra.idCompra,
                observacion: `Compra realizada por ${usuario.nombre}`,
              },
            });
          }
        }
        //Retornamos la compra creada
        return nuevaCompra;
      });
    } catch (error: any) {
      console.error('Error en transacción de compra:', error);
      throw new Error('Error al crear la compra');
    }
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
    data: UpdateCompraDto,
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
          // Crear el detalle de la compra
          await tx.detalleCompra.create({
            data: {
              idCompra: compraId,
              idProducto: item.idProducto,
              cantidad: item.cantidad,
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
              observacion: 'Compra actualizada por ' + usuario.nombre,
            },
          });
        }

        // 7. Retornar la compra actualizada
        return tx.compras.findUnique({
          where: { idCompra: compraId },
          include: { detalleCompra: true },
        });
      });
    } catch (error: any) {
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
        cantidad: true,
        producto: {
          select: { nombre: true },
        },
        compra: {
          select: {
            idCompra: true,
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
                      (await this.prisma.tipoMovimientos.findFirst({
                        where: { tipo: 'ENTRADA' },
                      }))?.idTipoMovimiento ?? undefined
                    ),
                  },
                  // igualamos idProducto a este detalleCompra
                // Prisma infiere que `this` es el campo `producto`,
                  // pero lo más explícito es:
                // idProducto: { equals: /* mismo idProducto */ }
              },
              select: { cantidadMovimiendo: true },
              take: 1,
            },
          },
        },
      },
    });

    //2) Contruyo un objeto de agrupacion por idCompra
    const agrupado: Record<
      string,
      {
        idCompra: string;
        FechaCompra: Date;
        productos: Array<{
          nombre: string;
          cantidad: number;
          cantidadMovimiendo: number;
        }>;
      }
    > = {};

    detalles.forEach((dc) => {
      const key = dc.compra.idCompra;
      if (!agrupado[key]) {
        agrupado[key] = {
          idCompra: key,
          FechaCompra: dc.compra.FechaCompra,
          productos: [],
        };
      }
      agrupado[key].productos.push({
        nombre: dc.producto.nombre,
        cantidad: dc.cantidad,
        cantidadMovimiendo:
          dc.compra.movimientosInventario[0]?.cantidadMovimiendo ?? 0
      });
    });

    // 3) Devuelvo como array
    return Object.values(agrupado);
  }
}
