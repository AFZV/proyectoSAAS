import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
//import { CreateProductoDto } from './dto/create-producto.dto';

@Injectable()
export class ProductosService {
  constructor(private prisma: PrismaService) {}
  // //
}
