import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductoDto } from './dto/create-producto.dto';

@Injectable()
export class ProductosService {
  constructor(private prisma: PrismaService) {}
  async create(data: CreateProductoDto) {
    const producto = await this.prisma.producto.create({
      data: { ...data },
    });
    console.log('esto llega en data al abckend para crear producto:', data);
    return producto;
  }
}
