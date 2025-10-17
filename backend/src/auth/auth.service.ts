import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { CompleteClientRegistrationDto } from './dto/complete-client-registration.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async getUserByCodigo(userId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { codigo: userId },
      select: {
        id: true,
        empresaId: true,
        rol: true,
        nombre: true,
        apellidos: true,
        empresa: {
          select: {
            nombreComercial: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado en base de datos');
    }

    return {
      usuarioId: usuario.id,
      empresaId: usuario.empresaId,
      rol: usuario.rol,
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      logoUrl: usuario.empresa.logoUrl,
      nombreEmpresa: usuario.empresa.nombreComercial,
    };
  }
  async verificarSuperAdmin(usuario: UsuarioPayload) {
    if (!usuario || usuario.rol !== 'superadmin') {
      return null;
    }

    const existe = await this.prisma.usuario.findUnique({
      where: { id: usuario.id },
      select: {
        id: true,
        nombre: true,
        rol: true,
        correo: true,
        // otros campos que quieras retornar
      },
    });

    return existe?.rol === 'superadmin' ? existe : null;
  }

  // Historia 3: Completar registro de cliente existente
  async completeClientRegistration(dto: CompleteClientRegistrationDto) {
    const { clerkUserId, email, clienteId, empresaId, rol, telefono } = dto;

    // Validar que el cliente existe
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
    });

    if (!cliente) {
      throw new BadRequestException('Cliente no encontrado');
    }

    // Validar que la empresa existe
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });

    if (!empresa) {
      throw new BadRequestException('Empresa no encontrada');
    }

    // Validar que el cliente está asociado a la empresa
    const clienteEmpresa = await this.prisma.clienteEmpresa.findFirst({
      where: {
        clienteId,
        empresaId,
      },
    });

    if (!clienteEmpresa) {
      throw new BadRequestException(
        'El cliente no está asociado a esta empresa',
      );
    }

    // Verificar que no exista un usuario con el mismo email
    const existingUser = await this.prisma.usuario.findFirst({
      where: { correo: email },
    });

    if (existingUser) {
      throw new BadRequestException('Ya existe un usuario con este email');
    }

    // Crear usuario en la base de datos
    const usuario = await this.prisma.usuario.create({
      data: {
        codigo: clerkUserId,
        nombre: cliente.nombre,
        apellidos: cliente.apellidos,
        telefono: telefono || cliente.telefono,
        correo: email,
        rol: rol,
        empresaId: empresaId,
        estado: 'activo',
      },
    });

    return {
      message: 'Registro completado exitosamente',
      usuario: {
        id: usuario.id,
        email: usuario.correo,
        rol: usuario.rol,
        empresaId: usuario.empresaId,
      },
    };
  }
}
