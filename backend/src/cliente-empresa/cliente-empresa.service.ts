import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClienteEmpresaService {
  constructor(private prisma: PrismaService) {}

  async asociar({
    clienteId,
    empresaId,
    vendedorId,
  }: {
    clienteId: string;
    empresaId: string;
    vendedorId: string;
  }) {
    // Validar si ya existe la asociación
    const existe = await this.prisma.clienteEmpresa.findFirst({
      where: {
        clienteId,
        empresaId,
      },
    });

    if (existe) {
      throw new ConflictException(
        'El cliente ya está asociado a esta empresa.',
      );
    }
    console.log('🔍 Asociando cliente con:', {
      clienteId,
      empresaId,
      vendedorId,
    });

    // Crear asociación
    return await this.prisma.clienteEmpresa.create({
      data: {
        cliente: {
          connect: { id: clienteId },
        },
        empresa: {
          connect: { id: empresaId },
        },
        usuario: {
          connect: { id: vendedorId },
        },
      },
    });
  }
}
