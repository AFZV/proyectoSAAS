// reportes.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { CrearReporteInvDto } from './dto/crear-reporte-inventario.dto';
import { CrearReporteClienteCiudadDto } from './dto/crear-reporte-clientciudad-dto';
import { CrearReporteRangoProductoDto } from './dto/crear-reporte-rango-producto.dto';

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

  //Reporte de productos por rango de letras Iniciales
  async inventarioPorRango(
    usuario: UsuarioPayload,
    data: CrearReporteRangoProductoDto
  ): Promise<
    Array<{ nombre: string; cantidades: number; precio: number; total: number }>
  > {
    const { inicio, fin } = data;

    // 1) Generamos el array de letras entre inicio y fin
    const startCode = inicio.toUpperCase().charCodeAt(0);
    const endCode = fin.toUpperCase().charCodeAt(0);
    const letras: string[] = [];
    for (let c = startCode; c <= endCode; c++) {
      letras.push(String.fromCharCode(c));
    }

    // 2) Hacemos la consulta solo por empresaId + inicial de nombre
    const productos = await this.prisma.producto.findMany({
      where: {
        empresaId: usuario.empresaId,
        OR: letras.map((letter) => ({
          nombre: {
            startsWith: letter,
            mode: 'insensitive',
          },
        })),
      },
      include: { inventario: { select: { stockActual: true } } },
      orderBy: { nombre: 'asc' },
    });

    // 3) Mapeamos al formato esperado por el excel
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

  //reporte de clientes por vendedor
  async clientesPorVendedor(
    usuario: UsuarioPayload,
    vendedorId: string
  ): Promise<
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
      where: {
        empresaId: usuario.empresaId,
        usuarioId: vendedorId,
      },
      include: {
        cliente: {
          select: {
            id: true,
            nit: true,
            nombre: true,
            email: true,
            telefono: true,
            direccion: true,
            departamento: true,
            ciudad: true,
            rasonZocial: true,
          },
        },
      },
    });

    // Aplanamos el nested `cliente` al nivel superior
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

  //Reporte de clientes por ciudad
  async clientesPorCiudad(
    usuario: UsuarioPayload,
    data: CrearReporteClienteCiudadDto
  ): Promise<
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
    const { ciudad } = data;

    const clientes = await this.prisma.clienteEmpresa.findMany({
      where: {
        empresaId: usuario.empresaId,
        cliente: {
          ciudad: {
            equals: ciudad,
            mode: 'insensitive',
          },
        },
      },
      include: {
        cliente: {
          select: {
            id: true,
            nit: true,
            nombre: true,
            email: true,
            telefono: true,
            direccion: true,
            departamento: true,
            ciudad: true,
            rasonZocial: true,
          },
        },
      },
    });

    // Aplanamos el nested `cliente` al nivel superior
    return clientes.map((item) => ({
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

  //Reporte de todos los pedidos por fecha
  async pedidosAll(
    usuario: UsuarioPayload,
    data: CrearReporteInvDto
  ): Promise<
    Array<{
      id: string;
      cliente: string;
      fecha: Date;
      total: number;
    }>
  > {
    const { fechaInicio, fechaFin } = data;

    const pedidos = await this.prisma.pedido.findMany({
      where: {
        empresaId: usuario.empresaId,
        fechaPedido: {
          gte: new Date(fechaInicio),
          lte: new Date(fechaFin),
        },
      },
      // incluimos la relación para obtener el nombre del cliente
      include: {
        cliente: {
          select: { nombre: true },
        },
      },
      // puedes omitir el `select` y confiar en include si no hay otros campos que explotar
    });

    return pedidos.map((p) => ({
      id: p.id,
      cliente: p.cliente.nombre,
      fecha: p.fechaPedido,
      total: p.total,
    }));
  }

  //Reporte de pedidos por vendedor
  async pedidosPorVendedor(
    usuario: UsuarioPayload,
    vendedorId: string,
    data: CrearReporteInvDto
  ): Promise<
    Array<{
      id: string;
      cliente: string;
      fecha: Date;
      total: number;
    }>
  > {
    const { fechaInicio, fechaFin } = data;

    const pedidos = await this.prisma.pedido.findMany({
      where: {
        empresaId: usuario.empresaId,
        usuarioId: vendedorId,
        fechaPedido: {
          gte: new Date(fechaInicio),
          lte: new Date(fechaFin),
        },
      },
      include: {
        cliente: {
          select: { nombre: true },
        },
      },
    });

    return pedidos.map((p) => ({
      id: p.id,
      cliente: p.cliente.nombre,
      fecha: p.fechaPedido,
      total: p.total,
    }));
  }
}
