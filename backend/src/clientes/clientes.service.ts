import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UsuarioPayload } from 'src/types/usuario-payload';

@Injectable()
export class ClienteService {
  constructor(private prisma: PrismaService) {}
  async getCliente(nit: string, usuario: UsuarioPayload) {
    if (!usuario) throw new UnauthorizedException('Usuario no encontrado');

    const { empresaId, id: usuarioId, rol } = usuario;

    // Buscar el cliente por NIT
    const cliente = await this.prisma.cliente.findFirst({
      where: { nit },
      select: { id: true },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    // Buscar la relación ClienteEmpresa, con condiciones según el rol
    const relacion = await this.prisma.clienteEmpresa.findFirst({
      where: {
        clienteId: cliente.id,
        ...(rol !== 'admin' && {
          empresaId,
          usuarioId,
        }),
      },
      include: {
        cliente: true,
      },
    });

    if (!relacion) {
      throw new NotFoundException('Cliente no encontrado o no autorizado');
    }

    return relacion.cliente;
  }

  async crearCliente(data: CreateClienteDto) {
    const existente = await this.prisma.cliente.findFirst({
      where: { nit: data.nit },
    });

    if (existente) {
      return existente;
    }

    const cliente = await this.prisma.cliente.create({
      data: {
        nit: data.nit,
        nombre: data.nombre,
        apellidos: data.apellidos,
        telefono: data.telefono,
        email: data.email,
        direccion: data.direccion,
        departamento: data.departamento,
        ciudad: data.ciudad,
        estado: data.estado,
      },
    });

    await this.prisma.clienteEmpresa.create({
      data: {
        clienteId: cliente.id,
        empresaId: data.empresaId,
        usuarioId: data.usuarioId,
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

    const { id: usuarioId, rol, empresaId } = usuario;

    // Consultar los clientes según el rol
    const clienteEmpresas = await this.prisma.clienteEmpresa.findMany({
      where:
        rol === 'admin'
          ? { empresaId }
          : {
              empresaId,
              usuarioId,
            },
      include: {
        cliente: {
          select: {
            nit: true,
            nombre: true,
            apellidos: true,
            telefono: true,
            ciudad: true,
            email: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: {
        cliente: {
          nombre: 'asc',
        },
      },
    });

    // Devolver los datos del cliente junto con su vendedor
    return clienteEmpresas.map((ce) => ({
      ...ce.cliente,
      usuario: ce.usuario,
    }));
  }
}
