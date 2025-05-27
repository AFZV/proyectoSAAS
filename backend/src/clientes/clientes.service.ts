import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';

@Injectable()
export class ClienteService {
  constructor(private prisma: PrismaService) {}
  async getCliente(nit: string, userId: string) {
    // 1. Obtener el usuario actual (vendedor o admin)
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        codigo: userId,
      },
      select: {
        id: true,
        rol: true,
        empresaId: true,
      },
    });

    if (!usuario) throw new UnauthorizedException('Usuario no encontrado');

    // 2. Buscar la relación ClienteEmpresa que coincida
    const relacion = await this.prisma.clienteEmpresa.findFirst({
      where: {
        empresa: { id: usuario.empresaId },
        cliente: { nit: nit },
        ...(usuario.rol !== 'admin' && { vendedorId: usuario.id }), // si no es admin, validar que sea su cliente
      },
      include: {
        cliente: true,
      },
    });

    if (!relacion) {
      throw new NotFoundException('Cliente no encontrado o no autorizado');
    }

    // 3. Devolver todos los datos del cliente
    return relacion.cliente;
  }

  async crearCliente(data: CreateClienteDto) {
    const existente = await this.prisma.cliente.findFirst({
      where: { nit: data.nit },
    });

    if (existente) {
      return existente;
    }

    return await this.prisma.cliente.create({
      data: {
        ...data,
      },
    });
  }

  async getClientesPorUsuario(userId: string) {
    // Buscar al usuario por su código Clerk
    const usuario = await this.prisma.usuario.findUnique({
      where: { codigo: userId },
      select: {
        id: true,
        rol: true,
        empresaId: true,
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const { id: vendedorId, rol, empresaId } = usuario;

    // Consultar los clientes según el rol
    const clienteEmpresas = await this.prisma.clienteEmpresa.findMany({
      where:
        rol === 'admin'
          ? { empresaId }
          : {
              empresaId,
              vendedorId,
            },
      include: {
        cliente: {
          select: {
            nit: true,
            nombres: true,
            apellidos: true,
            telefono: true,
            codigoCiud: true,
            email: true,
          },
        },
        vendedor: {
          select: {
            id: true,
            nombres: true,
          },
        },
      },
      orderBy: {
        cliente: {
          nombres: 'asc',
        },
      },
    });

    // Devolver los datos del cliente junto con su vendedor
    return clienteEmpresas.map((ce) => ({
      ...ce.cliente,
      vendedor: ce.vendedor,
    }));
  }
}
