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
  // Historia 4: Completar registro de cliente nuevo (sin empresa)
  // TODO: Create admin interface to:
  //   1. List clients in Clerk without Usuario in BD (pending assignment)
  //   2. Allow admin to assign cliente to empresa + vendedor
  //   3. Call this method again with empresaId to complete BD registration
  async completeClientRegistration(dto: CompleteClientRegistrationDto) {
    const { clerkUserId, email, clienteId, empresaId, rol, telefono } = dto;

    // Validar que el cliente existe
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
    });

    if (!cliente) {
      throw new BadRequestException('Cliente no encontrado');
    }

    // Si se proporciona empresaId, validar la empresa y la relación
    if (empresaId) {
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
    }

    // Verificar que no exista un usuario con el mismo email
    const existingUser = await this.prisma.usuario.findFirst({
      where: { correo: email },
    });

    if (existingUser) {
      throw new BadRequestException('Ya existe un usuario con este email');
    }

    // Crear usuario en la base de datos
    // IMPORTANT: empresaId is required in the Usuario table schema.
    // For new clients without empresa assignment:
    // - User is created in Clerk (can authenticate)
    // - User is NOT created in BD (no empresaId available)
    // - Admin must later:
    //   1. Create ClienteEmpresa relationship (assign cliente to empresa + vendedor)
    //   2. Call this service again to create Usuario in BD with empresaId
    // This approach prevents orphaned records and maintains data integrity.
    if (!empresaId) {
      return {
        message:
          'Usuario creado en Clerk. Pendiente de asignación de empresa por administrador',
        usuario: {
          clerkUserId,
          email,
          rol,
          empresaId: null,
        },
      };
    }

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
