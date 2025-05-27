import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('test-prisma')
export class PrismaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('conexion')
  async probarConexion() {
    try {
      // Ejecuta una consulta vacía a una tabla existente (puede ser cualquiera)
      await this.prisma.$queryRaw`SELECT 1`;

      return { ok: true, mensaje: 'Conexión a la base de datos exitosa.' };
    } catch (error) {
      console.error('Error al conectar con la BD:', error);
      return { ok: false, mensaje: 'Error al conectar con la base de datos.' };
    }
  }
}
