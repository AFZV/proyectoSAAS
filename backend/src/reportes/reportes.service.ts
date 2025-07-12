// reportes.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { CrearReporteInvDto } from './dto/crear-reporte-inventario.dto';

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  async inventarioValor(
    usuario: UsuarioPayload,
    data: CrearReporteInvDto
  ): Promise<
    Array<{ nombre: string; cantidades: number; precio: number; total: number }>
  > {
    const { fechaInicio, fechaFin } = data;
    const productos = await this.prisma.producto.findMany({
      where: {
        empresaId: usuario.empresaId,
        fechaCreado: {
          gte: new Date(fechaInicio),
          lte: new Date(fechaFin),
        },
      },
      include: { inventario: { select: { stockActual: true } } },
    });

    return productos.map(({ nombre, precioCompra, inventario }) => {
      const stock = inventario?.[0]?.stockActual ?? 0;
      return {
        nombre,
        cantidades: stock,
        precio: precioCompra,
        total: stock * precioCompra,
      };
    });
  }

  //Reporte de clientes
  async clientesAll(usuario: UsuarioPayload): Promise<
    Array<{
      id: string;
      nit: string;
      nombre: string;
      email: string;
      telefono: string;
      direccion: string;
      departamento: string;
      ciudad: string;
      rasonZocial: string;
    }>
  > {
    const raw = await this.prisma.clienteEmpresa.findMany({
      where: { empresaId: usuario.empresaId },
      include: {
        cliente: {
          select: {
            id: true,
            nit: true,
            nombre: true,
            email: true,
            telefono: true,
            rasonZocial: true,
            direccion: true,
            departamento: true,
            ciudad: true,
          },
        },
      },
    });

    // “Aplanamos” el nested `cliente` al nivel superior
    return raw.map((item) => ({
      id: item.cliente.id,
      nit: item.cliente.nit,
      nombre: item.cliente.nombre,
      email: item.cliente.email,
      telefono: item.cliente.telefono,
      direccion: item.cliente.direccion,
      departamento: item.cliente.departamento,
      ciudad: item.cliente.ciudad,
      rasonZocial: item.cliente.rasonZocial,
    }));
  }
}
