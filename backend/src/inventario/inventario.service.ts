import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventarioService {
  constructor(private prisma: PrismaService) {}
  //Crear el inventario de un producto
  async create(empresaId: string, productoId: string, stockActual: number) {
    //Validacion de existencias
    const empresa = await this.prisma.empresa.findUnique({where:{id:empresaId}});
    if (!empresa) throw new NotFoundException(`Empresa ${empresaId} no encontrada`);

    const producto = await this.prisma.producto.findUnique({where: { id: productoId } });
    if (!producto) throw new NotFoundException(`Producto ${productoId} no encontrado`);

    return this.prisma.inventario.create({
      data: {
        stockActual,
        producto: {
          connect: { id: productoId },
        },
        empresa: {
          connect: { id: empresaId },
        },
      },
    });
  }
}
