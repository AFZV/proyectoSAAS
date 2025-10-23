import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkService } from '../clerk/clerk.service';
import { AsignarPasswordDto } from './dto/asignar-password.dto';
import { RegistroClienteDto } from './dto/registro-cliente.dto';

@Injectable()
export class AuthPublicService {
    constructor(
        private prisma: PrismaService,
        private clerkService: ClerkService,
    ) { }

    /**
     * CASO 1: Cliente existente asigna contraseña
     */
    async asignarPasswordClienteExistente(dto: AsignarPasswordDto) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Limpiar y validar NIT
            const nitLimpio = dto.nit.replace(/\D/g, '');
            if (!nitLimpio) {
                throw new BadRequestException('NIT inválido');
            }

            // 2. Validar que cliente existe
            const cliente = await tx.cliente.findFirst({
                where: { nit: nitLimpio },
            });

            if (!cliente) {
                throw new NotFoundException('Cliente no encontrado');
            }

            // 3. Validar que NO tenga usuario ya creado
            const usuarioExistente = await tx.usuario.findFirst({
                where: {
                    correo: cliente.email,
                    rol: 'CLIENTE',
                },
            });

            if (usuarioExistente) {
                throw new BadRequestException('Este cliente ya tiene una cuenta');
            }

            // 4. Verificar que email no esté en uso en Clerk
            const emailEnUso = await this.clerkService.emailExists(cliente.email);
            if (emailEnUso) {
                throw new BadRequestException(
                    'Este email ya está registrado en el sistema',
                );
            }

            // 5. Crear usuario en Clerk
            let clerkUserId: string;
            try {
                const clerkUser = await this.clerkService.createClientUser({
                    email: cliente.email,
                    password: dto.password,
                    firstName: cliente.nombre,
                    lastName: cliente.apellidos,
                    phoneNumber: cliente.telefono,
                });
                clerkUserId = clerkUser.clerkUserId;
            } catch (error) {
                throw new BadRequestException('Error creando cuenta en Clerk');
            }

            // 6. Buscar el ADMIN de la empresa seleccionada
            const adminEmpresa = await tx.usuario.findFirst({
                where: {
                    empresaId: dto.empresaId,
                    rol: 'admin',
                    estado: 'activo',
                },
            });

            if (!adminEmpresa) {
                await this.clerkService.deleteUser(clerkUserId);
                throw new BadRequestException('No hay admin disponible en esta empresa');
            }

            try {
                // 7. Crear usuario CLIENTE en BD
                const usuario = await tx.usuario.create({
                    data: {
                        codigo: clerkUserId,
                        clienteId: cliente.id,
                        nombre: cliente.nombre,
                        apellidos: cliente.apellidos,
                        telefono: cliente.telefono,
                        correo: cliente.email,
                        rol: 'CLIENTE',
                        empresaId: dto.empresaId,
                        estado: 'activo',
                    },
                });

                // 8. Crear/actualizar ClienteEmpresa con el ADMIN como vendedor
                await tx.clienteEmpresa.upsert({
                    where: {
                        clienteId_empresaId: {
                            clienteId: cliente.id,
                            empresaId: dto.empresaId,
                        },
                    },
                    create: {
                        clienteId: cliente.id,
                        empresaId: dto.empresaId,
                        usuarioId: adminEmpresa.id,
                    },
                    update: {
                        // Si ya existe, no modificamos el vendedor asignado
                    },
                });

                return {
                    success: true,
                    message: 'Cuenta creada exitosamente',
                    usuario: {
                        id: usuario.id,
                        email: usuario.correo,
                        rol: usuario.rol,
                        nombre: usuario.nombre,
                        apellidos: usuario.apellidos,
                    },
                };
            } catch (error) {
                // Rollback: eliminar usuario de Clerk
                await this.clerkService.deleteUser(clerkUserId);
                throw error;
            }
        });
    }

    /**
     * CASO 2: Cliente nuevo autoregistro completo
     */
    async registrarClienteNuevo(dto: RegistroClienteDto) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Limpiar y validar NIT
            const nitLimpio = dto.nit.replace(/\D/g, '');
            if (!nitLimpio) {
                throw new BadRequestException('NIT inválido');
            }

            // 2. Validar que NIT NO exista
            const existente = await tx.cliente.findFirst({
                where: { nit: nitLimpio },
            });

            if (existente) {
                throw new BadRequestException(
                    'Este NIT ya está registrado. Si ya eres cliente, usa la opción "Ya tengo cuenta"',
                );
            }

            // 3. Validar que email NO esté en uso
            const emailEnUso = await this.clerkService.emailExists(dto.email);
            if (emailEnUso) {
                throw new BadRequestException('Este email ya está registrado');
            }

            // 4. Crear usuario en Clerk
            let clerkUserId: string;
            try {
                const clerkUser = await this.clerkService.createClientUser({
                    email: dto.email,
                    password: dto.password,
                    firstName: dto.nombre,
                    lastName: dto.apellidos,
                    phoneNumber: dto.telefono,
                });
                clerkUserId = clerkUser.clerkUserId;
            } catch (error) {
                throw new BadRequestException('Error creando cuenta en Clerk');
            }

            // 5. Buscar admin de empresa
            const adminEmpresa = await tx.usuario.findFirst({
                where: {
                    empresaId: dto.empresaId,
                    rol: 'admin',
                    estado: 'activo',
                },
            });

            if (!adminEmpresa) {
                await this.clerkService.deleteUser(clerkUserId);
                throw new BadRequestException('No hay admin disponible en esta empresa');
            }

            try {
                // 6. Crear Cliente
                const cliente = await tx.cliente.create({
                    data: {
                        nit: nitLimpio,
                        rasonZocial: dto.razonSocial || '',
                        nombre: dto.nombre,
                        apellidos: dto.apellidos,
                        telefono: dto.telefono,
                        email: dto.email,
                        direccion: dto.direccion,
                        departamento: dto.departamento,
                        ciudad: dto.ciudad,
                        estado: true,
                    },
                });

                // 7. Crear Usuario CLIENTE
                const usuario = await tx.usuario.create({
                    data: {
                        codigo: clerkUserId,
                        clienteId: cliente.id,
                        nombre: dto.nombre,
                        apellidos: dto.apellidos,
                        telefono: dto.telefono,
                        correo: dto.email,
                        rol: 'CLIENTE',
                        empresaId: dto.empresaId,
                        estado: 'activo',
                    },
                });

                // 8. Crear ClienteEmpresa con admin como vendedor
                await tx.clienteEmpresa.create({
                    data: {
                        clienteId: cliente.id,
                        empresaId: dto.empresaId,
                        usuarioId: adminEmpresa.id,
                    },
                });

                // TODO: Enviar notificación a empresa (async)
                // setImmediate(() => { ... })

                return {
                    success: true,
                    message: 'Cuenta creada exitosamente. Ya puedes iniciar sesión.',
                    usuario: {
                        id: usuario.id,
                        email: usuario.correo,
                        rol: usuario.rol,
                        nombre: usuario.nombre,
                        apellidos: usuario.apellidos,
                    },
                };
            } catch (error) {
                // Rollback: eliminar usuario de Clerk
                await this.clerkService.deleteUser(clerkUserId);
                throw error;
            }
        });
    }
}
