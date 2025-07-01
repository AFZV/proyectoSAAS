import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MovimientoInventarioDto } from './dto/movimientos-inventario.dto';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventarioService {
  constructor(private prisma: PrismaService) {}
  //Crear el inventario de un producto
  async create(
    usuario: UsuarioPayload,
    productoId: string,
    stockReferenciaOinicial: number
  ) {
    //Validacion de existencias
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: usuario.empresaId },
    });
    if (!empresa)
      throw new NotFoundException(`Empresa ${usuario.empresaId} no encontrada`);

    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId },
    });
    if (!producto)
      throw new NotFoundException(`Producto ${productoId} no encontrado`);

    return this.prisma.inventario.create({
      data: {
        stockReferenciaOinicial,
        stockActual: stockReferenciaOinicial,
        producto: {
          connect: { id: productoId },
        },
        empresa: {
          connect: { id: usuario.empresaId },
        },
      },
    });
  }
  //Obtener los tipos de movimiento de inventario
  async getTiposMov() {
    try {
      return await this.prisma.tipoMovimientos.findMany({
        select: {
          idTipoMovimiento: true,
          tipo: true,
        },
        where: {
          tipo: {
            not: 'AJUSTE',
          },
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Error al obtener los tipos de movimiento'
      );
    }
  }

  //Obtener los productos y su inventario
  async getProductos(usuario: UsuarioPayload) {
    try {
      return await this.prisma.producto.findMany({
        where: { empresaId: usuario.empresaId },
        select: {
          id: true,
          nombre: true,
          precioCompra: true,
          fechaCreado: true,
          inventario: {
            where: { idEmpresa: usuario.empresaId },
            select: { stockReferenciaOinicial: true, stockActual: true },
          },
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener los productos');
    }
  }

  //Obtener  todos los movimientos de inventario de un producto

  async getMovimientosproduc(productoId: string, usuario: UsuarioPayload) {
    try {
      const movimientos = await this.prisma.movimientoInventario.findMany({
        where: {
          idProducto: productoId,
          idEmpresa: usuario.empresaId,
        },
        select: {
          // Campos propios del movimiento
          cantidadMovimiendo: true,
          fechaMovimiento: true,
          observacion: true,

          // Relación con tipoMovimiento
          tipoMovimiento: {
            select: { tipo: true },
          },

          // Relación con usuario
          usuario: {
            select: { nombre: true, apellidos: true },
          },

          // Relación con producto, anidando luego el inventario
          producto: {
            select: {
              nombre: true,
              precioCompra: true,
              inventario: {
                select: {
                  stockReferenciaOinicial: true,
                  stockActual: true,
                },
              },
            },
          },
        },
        orderBy: {
          fechaMovimiento: 'desc',
        },
      });

      return movimientos.map( (m): MovimientoInventarioDto => ({
          tipoMovimiento: m.tipoMovimiento.tipo,
          nombreProducto: m.producto.nombre,
          precioCompra: m.producto.precioCompra,
          usuario: `${m.usuario.nombre} ${m.usuario.apellidos}`,
          cantidadMovimiendo: m.cantidadMovimiendo,
          stockInicial:
            m.producto.inventario?.[0]?.stockReferenciaOinicial ?? 0,
          stockActual: m.producto.inventario?.[0]?.stockActual ?? 0,
          fecha: m.fechaMovimiento,
          observacion: m.observacion || null,
        })
      );
    } catch (error) {
      console.error('Error interno al obtener movimientos:', error);
      throw new InternalServerErrorException(
        'Error al obtener los movimientos de inventario'
      );
    }
  }

/**
   * Ajuste manual de inventario: ENTRADA o SALIDA
   * También registra un MovimientoInventario con observación "Ajuste manual".
   */
  async updateInventario(
    productoId: string,
    tipomovid: string,
    cantidad: number,
    usuario: UsuarioPayload,
  ): Promise<{ stockActualizado: number; movimiento: MovimientoInventarioDto }> {
    try {
      // 1) Buscamos el inventario existente
      const inv = await this.prisma.inventario.findFirst({
        where: { idProducto: productoId, idEmpresa: usuario.empresaId },
      });
      if (!inv) {
        throw new NotFoundException(
          `Inventario para producto ${productoId} no encontrado`,
        );
      }

      // 2) Cargamos el tipo de movimiento (ENTRADA / SALIDA)
      const tipoMov = await this.prisma.tipoMovimientos.findUnique({
        where: { idTipoMovimiento: tipomovid },
      });
      if (!tipoMov) {
        throw new NotFoundException(
          `Tipo de movimiento ${tipomovid} no encontrado`,
        );
      }

      // 3) Preparamos la mutación del stock
      let updateData: Prisma.InventarioUpdateInput;
      if (tipoMov.tipo === 'ENTRADA') {
        updateData = { stockActual: { increment: cantidad } };
      } else if (tipoMov.tipo === 'SALIDA') {
        updateData = { stockActual: { decrement: cantidad } };
      } else {
        throw new NotFoundException(`Tipo de movimiento inválido: ${tipoMov.tipo}`);
      }

      // 4) Ejecutamos en transacción:
      //    a) Actualizamos inventario
      //    b) Creamos movimientoInventario **incluyendo** las relaciones necesarias
      const [invActualizado, movimientoRaw] = await this.prisma.$transaction([
        this.prisma.inventario.update({
          where: { idInventario: inv.idInventario },
          data: updateData,
        }),
        this.prisma.movimientoInventario.create({
          data: {
            idEmpresa: inv.idEmpresa,
            idProducto: inv.idProducto,
            cantidadMovimiendo: cantidad,
            idTipoMovimiento: tipoMov.idTipoMovimiento,
            IdUsuario: usuario.id,
            observacion: 'Ajuste manual',
          },
          include: {
            tipoMovimiento: { select: { tipo: true } },
            usuario:          { select: { nombre: true, apellidos: true } },
            producto: {
              select: {
                nombre: true,
                precioCompra: true,
                inventario: {
                  where: { idEmpresa: usuario.empresaId },
                  select: { stockReferenciaOinicial: true, stockActual: true },
                  take: 1,
                },
              },
            },
          },
        }),
      ]);

      // 5) Mapear al DTO
      const movimiento: MovimientoInventarioDto = {
        tipoMovimiento: movimientoRaw.tipoMovimiento.tipo,
        nombreProducto: movimientoRaw.producto.nombre,
        precioCompra: movimientoRaw.producto.precioCompra,
        usuario: `${movimientoRaw.usuario.nombre} ${movimientoRaw.usuario.apellidos}`,
        cantidadMovimiendo: movimientoRaw.cantidadMovimiendo,
        stockInicial: movimientoRaw.producto.inventario[0]?.stockReferenciaOinicial ?? 0,
        stockActual: movimientoRaw.producto.inventario[0]?.stockActual ?? 0,
        fecha: movimientoRaw.fechaMovimiento,
        observacion: movimientoRaw.observacion,
      };

      return {
        stockActualizado: invActualizado.stockActual,
        movimiento,
      };
    } catch (error) {
      console.error('Error al actualizar el inventario:', error);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Error interno al ajustar el inventario',
      );
    }
  }
}
