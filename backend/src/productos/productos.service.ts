import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateProductoDto } from './dto/create-producto.dto';

@Injectable()
export class ProductosService {
  constructor(
    private prisma: PrismaService,
    private AuthService: AuthService,
  ) {}

  async create(userId: string, data: CreateProductoDto) {
    try {
      await this.AuthService.verificarSuperAdmin(userId);
      return await this.prisma.producto.create({ data });
    } catch (error: any) {
      console.error('Error al crear el producto:', error);
      // Si ya es una HttpException (ForbiddenException, etc), re-lánzala
      if (error.getStatus && typeof error.getStatus === 'function') {
        throw error;
      }
      // Si no, lanza una InternalServerErrorException
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