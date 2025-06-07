import { Injectable, NotFoundException } from '@nestjs/common';
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
}
