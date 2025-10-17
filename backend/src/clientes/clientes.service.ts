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
import { formatearTexto } from 'src/lib/formatearTexto';

@Injectable()
export class ClienteService {
  constructor(private prisma: PrismaService) { }
  /// crea un cliente y lo asocia a una empresa y un usuario de esa empresa
  async crearCliente(data: CreateClienteDto, usuario: UsuarioPayload) {
    if (!usuario) throw new BadRequestException('EL USUARIO ES REQUERIDO');

    const { empresaId } = usuario;

    // Buscar cliente por NIT
    const existente = await this.prisma.cliente.findFirst({
      where: { nit: data.nit },
    });

    if (existente) {
      // Verificar si ya está asociado a la empresa actual
      const relacionExistente = await this.prisma.clienteEmpresa.findFirst({
        where: {
          clienteId: existente.id,
          empresaId,
        },
      });

      if (relacionExistente) {
        throw new BadRequestException(
          'El cliente ya está registrado en esta empresa'
        );
      }

      // Si existe el cliente pero no está asociado, creamos la relación
      if (!data.usuarioId) {
        throw new BadRequestException(
          'El ID del vendedor es obligatorio para vincular clientes',
        );
      }

      const relacion = await this.prisma.clienteEmpresa.create({
        data: {
          clienteId: existente.id,
          empresaId,
          usuarioId: data.usuarioId,
        },
      });

      return {
        message: 'Cliente vinculado a la empresa correctamente',
        cliente: existente,
        relacion,
      };
    }

    // Si no existe el cliente, lo creamos
    if (!data.usuarioId) {
      throw new BadRequestException(
        'El ID del vendedor es obligatorio para crear clientes',
      );
    }

    const vendedorId = data.usuarioId; // Asegurar que no es undefined

    const dataCleaned = {
      ...data,
      departamento: formatearTexto(data.departamento),
      ciudad: formatearTexto(data.ciudad),
      nombre: formatearTexto(data.nombre),
      apellidos: formatearTexto(data.apellidos),
      rasonZocial: formatearTexto(data.rasonZocial),
    };
    const { usuarioId, ...clienteData } = dataCleaned;

    const cliente = await this.prisma.cliente.create({
      data: {
        ...clienteData,
        estado: true,
      },
    });

    const relacion = await this.prisma.clienteEmpresa.create({
      data: {
        clienteId: cliente.id,
        empresaId,
        usuarioId: vendedorId,
      },
    });

    return {
      message: 'Cliente creado y vinculado correctamente',
      cliente,
      relacion,
    };
  }

  async actualizarCliente(
    data: UpdateClienteDto,
    clienteId: string,
    usuario: UsuarioPayload
  ) {
    if (!clienteId) throw new BadRequestException('El clienteId es requerido');

    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
    });

    if (!cliente) throw new BadRequestException('El cliente no existe');

    const { usuarioId, ...clienteData } = data;

    // ✅ Actualiza datos del cliente
    const clienteUpdated = await this.prisma.cliente.update({
      where: { id: cliente.id },
      data: { ...clienteData },
    });

    // ✅ Si viene usuarioId en la data, actualiza la relación en ClienteEmpresa
    if (usuarioId) {
      await this.prisma.clienteEmpresa.updateMany({
        where: {
          clienteId: clienteUpdated.id,
          empresaId: usuario.empresaId, // ✅ solo relación en la empresa actual
        },
        data: {
          usuarioId, // asigna el nuevo vendedor
        },
      });
    }

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

  // clientes.service.ts

  async getAllClientesDeEmpresa(usuario: UsuarioPayload) {
    if (!usuario) throw new UnauthorizedException('Usuario no encontrado');

    const { empresaId, rol, id: usuarioId } = usuario;

    // admin y bodega -> toda la empresa; vendedor -> solo asignados a ese usuario
    const where =
      rol === 'admin' || rol === 'bodega'
        ? { empresas: { some: { empresaId } } }
        : { empresas: { some: { empresaId, usuarioId } } };

    const items = await this.prisma.cliente.findMany({
      where,
      select: {
        id: true,
        nit: true,
        rasonZocial: true,
        nombre: true,
        apellidos: true,
        telefono: true,
        email: true,
        ciudad: true,
        departamento: true,
        estado: true,
      },
      orderBy: [
        { rasonZocial: 'asc' },
        { nombre: 'asc' },
        { apellidos: 'asc' },
      ],
    });

    // devolvemos el array tal cual (sin lanzar NotFound)
    return items;
  }

  async getClientePorNit(nit: string, usuario: UsuarioPayload) {
    if (!usuario) {
      throw new UnauthorizedException('Usuario no autorizado');
    }
    const { id: usuarioId, rol, empresaId } = usuario;

    const cliente = await this.prisma.cliente.findFirst({
      where: {
        nit: nit,
      },
    });

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
            id: true,
            nit: true,
            rasonZocial: true,
            nombre: true,
            apellidos: true,
            telefono: true,
            ciudad: true,
            email: true,
            departamento: true,
            direccion: true,
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
      vendedorId: usuario.id,
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

  async getVendedoresPorEmpresa(usuario: UsuarioPayload) {
    if (!usuario) {
      throw new BadRequestException('El usuario es requerido');
    }

    const { empresaId, rol, id: usuarioId } = usuario;

    if (rol === 'admin') {
      // ✅ Admin ve todos los vendedores + su propio usuario
      return await this.prisma.usuario.findMany({
        where: {
          empresaId,
          OR: [
            { id: usuarioId }, // Incluye el admin actual
            { rol: 'vendedor' }, // Incluye todos los vendedores
          ],
        },
        select: {
          id: true,
          nombre: true,
          rol: true,
        },
      });
    }

    if (rol === 'vendedor') {
      return await this.prisma.usuario.findUnique({
        where: {
          id: usuarioId,
        },
        select: {
          id: true,
          nombre: true,
        },
      });
    }

    // Opcional: para otros roles devolver vacío
    return [];
  }

  // Historia 2: Buscar cliente por NIT (público)
  async findByNit(nit: string) {
    return this.prisma.cliente.findFirst({
      where: { nit },
      include: {
        empresas: {
          include: {
            empresa: {
              select: {
                id: true,
                nombreComercial: true,
              },
            },
          },
        },
      },
    });
  }

  // Método para crear cliente desde registro público (sin autenticación)
  async crearClientePublico(data: CreateClienteDto) {
    // Verificar si ya existe el cliente por NIT
    const existente = await this.prisma.cliente.findFirst({
      where: { nit: data.nit },
    });

    if (existente) {
      throw new BadRequestException(
        'Ya existe un cliente registrado con ese NIT'
      );
    }

    // Limpiar y formatear datos
    const dataCleaned = {
      nit: data.nit,
      rasonZocial: formatearTexto(data.rasonZocial || ''),
      nombre: formatearTexto(data.nombre),
      apellidos: formatearTexto(data.apellidos),
      direccion: formatearTexto(data.direccion),
      telefono: data.telefono,
      email: data.email.toLowerCase(),
      departamento: formatearTexto(data.departamento),
      ciudad: formatearTexto(data.ciudad),
    };

    // Crear cliente sin vendedor ni empresa asignada inicialmente
    const cliente = await this.prisma.cliente.create({
      data: {
        ...dataCleaned,
        estado: true,
      },
    });

    return {
      message: 'Cliente registrado correctamente',
      cliente,
      id: cliente.id,
      nit: cliente.nit,
      nombre: cliente.nombre,
      apellidos: cliente.apellidos,
      email: cliente.email,
    };
  }
}
