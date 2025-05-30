import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductoDto } from './dto/create-producto.dto';

@Injectable()
export class ProductosService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateProductoDto) {
    try {
      return await this.prisma.producto.create({
        //Datos envias en el DTO
        data,
      });
    } catch (error: any) {
      throw new InternalServerErrorException('Error al crear el producto');
    }
  }

  async findAllforEmpresa(empresaId: string) {
    try {
      return await this.prisma.producto.findMany({
        where: {
          empresaId: empresaId,
        },
        include: {
          //Incluimos el inventario del producto
          inventario: {
            where: { idEmpresa: empresaId },
            select: { stockActual: true },
          },
        },
      });
    } catch (error: any) {
      throw new InternalServerErrorException('Error al obtener los productos');
    }
  }
}