import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { UpdateClienteDto } from './dto/update-cliente.dto';

//import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClienteService {
  constructor(private prisma: PrismaService) {}
  /// crea un cliente y lo asocia a una empresa y un usuario de esa empresa
  async crearCliente(data: CreateClienteDto, usuario: UsuarioPayload) {
    if (!usuario) throw new BadRequestException('EL USUARIO ES REQUERIDO');
    const { empresaId, id: usuarioId } = usuario;
    const existente = await this.prisma.cliente.findFirst({
      where: { nit: data.nit },
    });

    if (existente) {
      return {
        messagge: 'el cliente ya existe cliente:',
        existente,
      };
    }

    const cliente = await this.prisma.cliente.create({
      data: {
        ...data,
        estado: true,
      },
    });

    const relacion = await this.prisma.clienteEmpresa.create({
      data: {
        clienteId: cliente.id,
        empresaId: empresaId,
        usuarioId: usuarioId,
      },
    });
    return {
      cliente,
      relacion,
    };
  }

  async actualizarCliente(data: UpdateClienteDto, clienteId: string) {
    if (!clienteId) throw new BadRequestException('el usuario es requerido');
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
    });

    if (!cliente) throw new BadRequestException('el cliente no existe');
    const clienteUpdated = await this.prisma.cliente.update({
      where: { id: cliente.id },
      data: { ...data },
    });
    return clienteUpdated;
  }

  //////////////////////////////////////
  //obtiene un cliente por nit pero filtra tambien si esta relacionado con la empresa y un usuario
  async getClientesPorFiltro(filtro: string, usuario: UsuarioPayload) {
    if (!usuario) throw new UnauthorizedException('Usuario no encontrado');

    const { empresaId, id: usuarioId, rol } = usuario;

    // Detectar si es un NIT o un nombre
    const esNit = /^\d{5,20}$/.test(filtro);
    const campoFiltro = esNit ? 'nit' : 'nombre';

    // Buscar relaciones cliente-empresa-usuario (con filtro dinámico)
    const relaciones = await this.prisma.clienteEmpresa.findMany({
      where: {
        empresaId,
        ...(rol !== 'admin' && { usuarioId }), // si no es admin, limitar al usuario
        cliente: {
          [campoFiltro]: {
            contains: filtro,
            mode: 'insensitive',
          },
        },
      },
      include: {
        cliente: true,
      },
      orderBy: {
        cliente: {
          nombre: 'asc',
        },
      },
    });

    if (relaciones.length === 0) {
      throw new NotFoundException('No se encontraron clientes que coincidan');
    }

    // Retornar solo los clientes (puedes incluir info del usuario si quieres también)
    return relaciones.map((rel) => rel.cliente);
  }

  async getClientePorNit(nit: string, usuario: UsuarioPayload) {
    if (!usuario) {
      throw new UnauthorizedException('Usuario no autorizado');
    }
    const { id: usuarioId, rol, empresaId } = usuario;
    console.log('entrando al service');
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        nit: nit,
      },
    });
    console.log('cliente encontrado:', cliente);
    if (!cliente) throw new NotFoundException('cliente no encontrado');

    const clienteEmpresa = await this.prisma.clienteEmpresa.findFirst({
      where: {
        empresaId,
        clienteId: cliente.id,
        ...(rol !== 'admin' && { usuarioId }),
      },
      include: {
        cliente: true,
      },
    });
    if (!clienteEmpresa) {
      throw new UnauthorizedException('Cliente no encontrado');
    }
    console.log('retornando al front:', clienteEmpresa);
    return clienteEmpresa;
  }

  //// retorna todos los clientes de un vendedor o toddos si el usuario es admin
  async getClientesPorUsuario(usuario: UsuarioPayload) {
    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const { id: usuarioId, rol, empresaId } = usuario;

    // Consultar los clientes según el rol y suuario
    const clientes = await this.prisma.clienteEmpresa.findMany({
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

    return clientes.map(({ cliente, usuario }) => ({
      ...cliente,
      usuario: usuario.nombre,
    }));
  }

  /////
  async getResumeCard(usuario: UsuarioPayload) {
    if (!usuario) throw new BadRequestException('el usuario es requerido');
    const { empresaId, rol, id: usuarioId } = usuario;

    const inactivos = await this.prisma.clienteEmpresa.count({
      where:
        rol === 'admin'
          ? {
              empresaId: empresaId,
              cliente: { estado: false },
            }
          : {
              empresaId: empresaId,
              usuarioId: usuarioId,
              cliente: { estado: false },
            },
    });

    const activos = await this.prisma.clienteEmpresa.count({
      where:
        rol === 'admin'
          ? { empresaId: empresaId, cliente: { estado: true } }
          : {
              empresaId: empresaId,
              usuarioId: usuarioId,
              cliente: { estado: true },
            },
    });
    const totalClientes = activos + inactivos;

    return {
      totalClientes,
      activos,
      inactivos,
    };
  }
}
