import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientesPublicService {
    constructor(private prisma: PrismaService) { }

    /**
     * Verificar si un NIT existe en la base de datos
     * Retorna info del cliente y empresas asociadas si existe
     */
    async verificarNitExistente(nit: string) {
        // Limpiar NIT (solo números)
        const nitLimpio = nit.replace(/\D/g, '');

        if (!nitLimpio) {
            return { existe: false };
        }

        const cliente = await this.prisma.cliente.findFirst({
            where: { nit: nitLimpio },
            select: {
                id: true,
                nit: true,
                nombre: true,
                apellidos: true,
                email: true,
                rasonZocial: true,
                empresas: {
                    select: {
                        empresa: {
                            select: {
                                id: true,
                                nombreComercial: true,
                                nit: true,
                            },
                        },
                    },
                },
            },
        });

        if (!cliente) {
            return { existe: false };
        }

        // Verificar si ya tiene cuenta de usuario
        const usuarioExistente = await this.prisma.usuario.findFirst({
            where: {
                correo: cliente.email,
                rol: 'CLIENTE',
            },
            select: {
                id: true,
                correo: true,
            },
        });

        return {
            existe: true,
            tieneCuenta: !!usuarioExistente,
            cliente: {
                nit: cliente.nit,
                nombre: cliente.nombre,
                apellidos: cliente.apellidos,
                email: cliente.email,
                razonSocial: cliente.rasonZocial,
                empresas: cliente.empresas.map((e) => ({
                    id: e.empresa.id,
                    nombre: e.empresa.nombreComercial,
                    nit: e.empresa.nit,
                })),
            },
        };
    }

    /**
     * Listar empresas públicas disponibles para registro
     * Devuelve todas las empresas (sin filtro de estado)
     */
    async listarEmpresasPublicas() {
        const empresas = await this.prisma.empresa.findMany({
            select: {
                id: true,
                nombreComercial: true,
                nit: true,
                telefono: true,
                direccion: true,
                logoUrl: true,
            },
            orderBy: {
                nombreComercial: 'asc',
            },
        });

        return { empresas };
    }
}
