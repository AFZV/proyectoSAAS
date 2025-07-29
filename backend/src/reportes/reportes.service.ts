import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { CrearReporteInvDto } from './dto/crear-reporte-inventario.dto';
import { CrearReporteClienteCiudadDto } from './dto/crear-reporte-clientciudad-dto';
import { CrearReporteRangoProductoDto } from './dto/crear-reporte-rango-producto.dto';

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ✅ Ajusta un rango de fechas a zona Bogotá (UTC-5)
   */
  private ajustarRangoBogota(
    fechaInicio: string | Date,
    fechaFin: string | Date
  ) {
    const bogotaOffset = -5 * 60; // UTC-5
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    const localOffset = inicio.getTimezoneOffset(); // minutos del servidor
    const diff = (bogotaOffset - localOffset) * 60 * 1000;

    inicio.setTime(inicio.getTime() + diff);
    inicio.setHours(0, 0, 0, 0);

    fin.setTime(fin.getTime() + diff);
    fin.setHours(23, 59, 59, 999);

    return { inicio, fin };
  }

  /** ✅ Inventario con stock */
  async inventarioValor(usuario: UsuarioPayload) {
    const productos = await this.prisma.producto.findMany({
      where: {
        empresaId: usuario.empresaId,
        estado: 'activo',
        inventario: { some: { stockActual: { gt: 0 } } },
      },
      orderBy: { fechaCreado: 'asc' },
      include: { inventario: { select: { stockActual: true } } },
    });

    return productos.map(({ id, nombre, precioCompra, inventario }) => {
      const stock = inventario?.[0]?.stockActual ?? 0;
      return {
        id,
        nombre,
        cantidades: stock,
        precio: precioCompra,
        total: stock * precioCompra,
      };
    });
  }

  /** ✅ Inventario completo */
  async inventarioCompleto(usuario: UsuarioPayload) {
    const productos = await this.prisma.producto.findMany({
      where: { empresaId: usuario.empresaId },
      orderBy: { fechaCreado: 'asc' },
      include: { inventario: { select: { stockActual: true } } },
    });

    return productos.map(({ id, nombre, precioCompra, inventario }) => {
      const stock = inventario?.[0]?.stockActual ?? 0;
      return {
        id,
        nombre,
        cantidades: stock,
        precio: precioCompra,
        total: stock * precioCompra,
      };
    });
  }

  /** ✅ Inventario por rango de letras */
  async inventarioPorRango(
    usuario: UsuarioPayload,
    data: CrearReporteRangoProductoDto
  ) {
    const { inicio, fin } = data;
    const start = inicio.toUpperCase().charCodeAt(0);
    const end = fin.toUpperCase().charCodeAt(0);
    const letras: string[] = [];
    for (let code = start; code <= end; code++) {
      letras.push(String.fromCharCode(code));
    }

    const productosRaw = await this.prisma.producto.findMany({
      where: { empresaId: usuario.empresaId },
      include: { inventario: { select: { stockActual: true } } },
    });

    const productosFiltrados = productosRaw
      .map((p) => ({
        nombre: p.nombre.trimStart(),
        precioCompra: p.precioCompra,
        stock: p.inventario?.[0]?.stockActual ?? 0,
      }))
      .filter((p) =>
        letras.some((letter) => p.nombre.toUpperCase().startsWith(letter))
      )
      .sort((a, b) =>
        a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
      );

    return productosFiltrados.map((p) => ({
      nombre: p.nombre,
      cantidades: p.stock,
      precio: p.precioCompra,
      total: p.stock * p.precioCompra,
    }));
  }

  /** ✅ Clientes (todos) */
  async clientesAll(usuario: UsuarioPayload) {
    const raw = await this.prisma.clienteEmpresa.findMany({
      where: { empresaId: usuario.empresaId },
      include: {
        cliente: {
          select: {
            id: true,
            nit: true,
            nombre: true,
            apellidos: true,
            email: true,
            telefono: true,
            direccion: true,
            departamento: true,
            ciudad: true,
            rasonZocial: true,
          },
        },
        usuario: { select: { nombre: true } },
      },
    });

    return raw.map((item) => ({
      vendedor: item.usuario.nombre,
      id: item.cliente.id,
      nit: item.cliente.nit,
      nombre: item.cliente.nombre + ' ' + item.cliente.apellidos,
      email: item.cliente.email,
      telefono: item.cliente.telefono,
      direccion: item.cliente.direccion,
      departamento: item.cliente.departamento,
      ciudad: item.cliente.ciudad,
      rasonZocial: item.cliente.rasonZocial,
    }));
  }

  /** ✅ Clientes por ciudad */
  async clientesPorCiudad(
    usuario: UsuarioPayload,
    data: CrearReporteClienteCiudadDto
  ) {
    const clientes = await this.prisma.clienteEmpresa.findMany({
      where: {
        empresaId: usuario.empresaId,
        cliente: { ciudad: { equals: data.ciudad, mode: 'insensitive' } },
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

  /** ✅ Reporte pedidos por fecha */
  async pedidosAll(usuario: UsuarioPayload, data: CrearReporteInvDto) {
    const { inicio, fin } = this.ajustarRangoBogota(
      data.fechaInicio,
      data.fechaFin
    );

    const pedidos = await this.prisma.pedido.findMany({
      where: {
        empresaId: usuario.empresaId,
        fechaPedido: { gte: inicio, lte: fin },
      },
      include: { cliente: { select: { nombre: true } } },
    });

    return pedidos.map((p) => ({
      id: p.id,
      cliente: p.cliente.nombre,
      fecha: p.fechaPedido,
      total: p.total,
    }));
  }

  /** ✅ Pedidos por vendedor */
  async pedidosPorVendedor(
    usuario: UsuarioPayload,
    vendedorId: string,
    data: CrearReporteInvDto
  ) {
    const { inicio, fin } = this.ajustarRangoBogota(
      data.fechaInicio,
      data.fechaFin
    );

    const pedidos = await this.prisma.pedido.findMany({
      where: {
        empresaId: usuario.empresaId,
        usuarioId: vendedorId,
        fechaPedido: { gte: inicio, lte: fin },
      },
      include: { cliente: { select: { nombre: true } } },
    });

    return pedidos.map((p) => ({
      id: p.id,
      cliente: p.cliente.nombre,
      fecha: p.fechaPedido,
      total: p.total,
    }));
  }

  /** ✅ Reporte de recaudo */
  async reporteRecaudo(usuario: UsuarioPayload, dto: CrearReporteInvDto) {
    if (!usuario) throw new BadRequestException('Usuario requerido');

    const { inicio, fin } = this.ajustarRangoBogota(
      dto.fechaInicio,
      dto.fechaFin
    );

    const recibos = await this.prisma.recibo.findMany({
      where: {
        empresaId: usuario.empresaId,
        Fechacrecion: { gte: inicio, lte: fin },
      },
      include: {
        detalleRecibo: { select: { valorTotal: true } },
        usuario: { select: { nombre: true, apellidos: true } },
      },
      orderBy: { Fechacrecion: 'desc' },
    });

    return recibos.map((r) => ({
      reciboId: r.id,
      fecha: r.Fechacrecion,
      tipo: r.tipo,
      valor: r.detalleRecibo.reduce((sum, d) => sum + (d.valorTotal ?? 0), 0),
      vendedor: `${r.usuario.nombre} ${r.usuario.apellidos}`.trim(),
      concepto: r.concepto,
    }));
  }

  /** ✅ Reporte de recaudo por vendedor */
  async reporteRecaudoVendedor(
    usuario: UsuarioPayload,
    dto: CrearReporteInvDto,
    vendedorId: string
  ) {
    if (!usuario) throw new BadRequestException('Usuario requerido');

    const { inicio, fin } = this.ajustarRangoBogota(
      dto.fechaInicio,
      dto.fechaFin
    );

    const recibos = await this.prisma.recibo.findMany({
      where: {
        empresaId: usuario.empresaId,
        Fechacrecion: { gte: inicio, lte: fin },
        ...(vendedorId && { usuarioId: vendedorId }),
      },
      include: {
        detalleRecibo: { select: { valorTotal: true } },
        usuario: { select: { nombre: true, apellidos: true } },
      },
      orderBy: { Fechacrecion: 'desc' },
    });

    return recibos.map((r) => ({
      reciboId: r.id,
      fecha: r.Fechacrecion,
      tipo: r.tipo,
      valor: r.detalleRecibo.reduce((sum, d) => sum + (d.valorTotal ?? 0), 0),
      concepto: r.concepto,
    }));
  }
}
