import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';

@Injectable()
export class InventarioService {
  constructor(private prisma: PrismaService) {}
  //Crear el inventario de un producto
  async create(
    usuario: UsuarioPayload,
    productoId: string,
    stockReferenciaOinicial: number,
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

  async updateInventario(productoId: string, stockReferenciaOinicial: number) {
    try {
      const inventario = await this.prisma.inventario.findFirst({
        where: { idProducto: productoId },
      });

      if (inventario) {
        //Si existe lo actualizamos
        return await this.prisma.inventario.update({
          where: { idInventario: inventario.idInventario },
          data: {
            stockReferenciaOinicial,
            stockActual: stockReferenciaOinicial,
          },
        });
      } else {
        // 2b) Si no existe, necesitamos empresaId para crear
        const producto = await this.prisma.producto.findUnique({
          where: { id: productoId },
          select: { empresaId: true },
        });
        if (!producto) {
          throw new NotFoundException(
            `Producto ${productoId} no encontrado para crear inventario`
          );
        }

        // Creamos el inventario nuevo
        return await this.prisma.inventario.create({
          data: {
            stockReferenciaOinicial,
            stockActual: stockReferenciaOinicial,
            producto: { connect: { id: productoId } },
            empresa: { connect: { id: producto.empresaId } },
          },
        });
    }
  } catch (error) {
    console.error('Error al obtener las categorías de productos:', error);
    // Si ya es una HttpException (ForbiddenException, etc), re-lánzala
    if (error) {
      throw error;
    }
    // Si no, lanza una InternalServerErrorException
    throw new InternalServerErrorException(
      'Error al obtener las categorías de productos',
    );
  }
}
}