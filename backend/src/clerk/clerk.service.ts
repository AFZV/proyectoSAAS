import { Injectable, BadRequestException } from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';

@Injectable()
export class ClerkService {
  private clerkClient;

  constructor() {
    // Inicializar cliente de Clerk con la secret key
    this.clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });
  }

  /**
   * Crear usuario en Clerk (para clientes autoregistrados)
   */
  async createClientUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
  }) {
    try {
      // Generar username a partir del email (parte antes del @)
      const username = data.email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      const user = await this.clerkClient.users.createUser({
        emailAddress: [data.email],
        password: data.password,
        username: username, // ← AGREGADO: username requerido por Clerk
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumbers: data.phoneNumber ? [data.phoneNumber] : [],
        publicMetadata: {
          rol: 'CLIENTE',
          autoregistrado: true,
          createdAt: new Date().toISOString(),
        },
      });

      return {
        clerkUserId: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        createdAt: user.createdAt,
      };
    } catch (error: any) {
      // Log diferenciado por ambiente
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error completo creando usuario en Clerk:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error code:', error.code);
        console.error(
          '❌ Error errors:',
          JSON.stringify(error.errors, null, 2)
        );
      } else {
        // En producción, log minimal con trace ID
        console.error('Error creando usuario en Clerk:', {
          traceId: error.clerkTraceId,
          status: error.status,
        });
      }

      // Manejar errores específicos de Clerk
      if (error.errors && Array.isArray(error.errors)) {
        const errorMessages = error.errors
          .map((e: any) => e.message)
          .join(', ');
        throw new BadRequestException(`Error en Clerk: ${errorMessages}`);
      }

      throw new BadRequestException(
        'Error creando usuario en Clerk. Verifica que el email no esté duplicado.'
      );
    }
  }

  /**
   * Eliminar usuario en Clerk (para rollback en caso de error)
   */
  async deleteUser(clerkUserId: string): Promise<void> {
    try {
      await this.clerkClient.users.deleteUser(clerkUserId);
      if (process.env.NODE_ENV === 'development') {
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error eliminando usuario de Clerk:', error);
      }
      // No lanzamos error para no romper el rollback
    }
  }

  /**
   * Verificar si un email ya existe en Clerk
   */
  async emailExists(email: string): Promise<boolean> {
    try {
      const users = await this.clerkClient.users.getUserList({
        emailAddress: [email],
      });

      return users.data.length > 0;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error verificando email en Clerk:', error);
      }
      return false;
    }
  }

  /**
   * Obtener usuario de Clerk por ID
   */
  async getUser(clerkUserId: string) {
    try {
      const user = await this.clerkClient.users.getUser(clerkUserId);
      return user;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error obteniendo usuario de Clerk:', error);
      }
      return null;
    }
  }

  /**
   * Actualizar metadata de usuario en Clerk
   */
  async updateUserMetadata(clerkUserId: string, metadata: Record<string, any>) {
    try {
      await this.clerkClient.users.updateUser(clerkUserId, {
        publicMetadata: metadata,
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error actualizando metadata en Clerk:', error);
      }
    }
  }

  /**
   * Verificar credenciales (solo para testing - NO usar en producción)
   * En producción, el login se hace desde el frontend con Clerk SDK
   */
  async verifyCredentials(email: string, password: string) {
    try {
      // Buscar usuario por email
      const users = await this.clerkClient.users.getUserList({
        emailAddress: [email],
      });

      if (users.data.length === 0) {
        return { success: false, message: 'Usuario no encontrado' };
      }

      const user = users.data[0];

      // Nota: Clerk NO expone un método directo para verificar password desde backend
      // El login real debe hacerse desde el frontend con @clerk/clerk-react o similar
      return {
        success: true,
        message: 'Usuario encontrado en Clerk',
        user: {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          metadata: user.publicMetadata,
        },
        note: 'Para login real, usa Clerk SDK desde el frontend',
      };
    } catch (error) {
      console.error('Error verificando credenciales:', error);
      return { success: false, message: 'Error verificando credenciales' };
    }
  }
}
