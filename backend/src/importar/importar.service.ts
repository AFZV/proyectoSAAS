import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ImportarService {
  constructor(prisma: PrismaService) {}

  async cargarMasivaProductos() {}
  async cargaMasivaInventario() {}
}
