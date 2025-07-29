import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { CrearReporteInvDto } from './dto/crear-reporte-inventario.dto';
import { CrearReporteClienteCiudadDto } from './dto/crear-reporte-clientciudad-dto';
import { CrearReporteRangoProductoDto } from './dto/crear-reporte-rango-producto.dto';

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ajustar rango de fechas al día completo */
  private normalizarRango(fechaInicio: string | Date, fechaFin: string | Date) {
    const inicio = new Date(fechaInicio);
    inicio.setHours(0, 0, 0, 0);

    const fin = new Date(fechaFin);
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
      nombre: `${item.cliente.nombre} ${item.cliente.apellidos}`.trim(),
      email: item.cliente.email,
      telefono: item.cliente.telefono,
      direccion: item.cliente.direccion,
      departamento: item.cliente.departamento,
      ciudad: item.cliente.ciudad,
      rasonZocial: item.cliente.rasonZocial,
    }));
  }

  /** ✅ Clientes por vendedor */
  async clientesPorVendedor(usuario: UsuarioPayload, vendedorId: string) {
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

  /** ✅ Pedidos por rango */
  async pedidosAll(usuario: UsuarioPayload, data: CrearReporteInvDto) {
    const { inicio, fin } = this.normalizarRango(
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
    const { inicio, fin } = this.normalizarRango(
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

  /** ✅ Reporte de pedidos con saldo pendiente */
  async saldosPendientesPorPedido(
    usuario: UsuarioPayload,
    dto: CrearReporteInvDto
  ) {
    const { inicio, fin } = this.normalizarRango(dto.fechaInicio, dto.fechaFin);

    const pedidos = await this.prisma.pedido.findMany({
      where: {
        empresaId: usuario.empresaId,
        fechaPedido: { gte: inicio, lte: fin },
      },
      include: {
        cliente: { select: { nombre: true } },
        detalleRecibo: { select: { valorTotal: true } },
        detalleAjusteCartera: { select: { valor: true } },
      },
    });

    return pedidos
      .map((p) => {
        const abonado = p.detalleRecibo.reduce((s, d) => s + d.valorTotal, 0);
        const ajustes = p.detalleAjusteCartera.reduce((s, d) => s + d.valor, 0);
        const saldoPendiente = p.total - abonado - ajustes;

        return {
          id: p.id,
          cliente: p.cliente.nombre,
          fecha: p.fechaPedido,
          saldoPendiente,
        };
      })
      .filter((x) => x.saldoPendiente > 0);
  }

  /** ✅ Reporte de pedidos por vendedor con saldo pendiente */
  async saldosPendientesPorPedidoVendedor(
    usuario: UsuarioPayload,
    vendedorId: string,
    dto: CrearReporteInvDto
  ) {
    const { inicio, fin } = this.normalizarRango(dto.fechaInicio, dto.fechaFin);

    const pedidos = await this.prisma.pedido.findMany({
      where: {
        empresaId: usuario.empresaId,
        usuarioId: vendedorId,
        fechaPedido: { gte: inicio, lte: fin },
      },
      include: {
        cliente: { select: { nombre: true } },
        detalleRecibo: { select: { valorTotal: true } },
        detalleAjusteCartera: { select: { valor: true } },
      },
    });

    return pedidos
      .map((p) => {
        const abonado = p.detalleRecibo.reduce((s, d) => s + d.valorTotal, 0);
        const ajustes = p.detalleAjusteCartera.reduce((s, d) => s + d.valor, 0);
        const saldoPendiente = p.total - abonado - ajustes;

        return {
          id: p.id,
          cliente: p.cliente.nombre,
          fecha: p.fechaPedido,
          saldoPendiente,
        };
      })
      .filter((x) => x.saldoPendiente > 0);
  }

  /** ✅ Balance general */
  async reporteBalanceGeneral(usuario: UsuarioPayload) {
    const { empresaId } = usuario;
    if (!empresaId) throw new BadRequestException('empresaId requerido');

    const movimientos = await this.prisma.movimientosCartera.findMany({
      where: { empresaId },
      select: {
        idCliente: true,
        valorMovimiento: true,
        tipoMovimientoOrigen: true,
      },
    });

    const saldoPorCliente: Record<string, number> = {};
    for (const mov of movimientos) {
      saldoPorCliente[mov.idCliente] = saldoPorCliente[mov.idCliente] || 0;
      if (mov.tipoMovimientoOrigen === 'PEDIDO') {
        saldoPorCliente[mov.idCliente] += mov.valorMovimiento;
      } else {
        saldoPorCliente[mov.idCliente] -= mov.valorMovimiento;
      }
    }

    const clientesIds = Object.keys(saldoPorCliente).filter(
      (id) => saldoPorCliente[id] > 0
    );

    const clientes = await this.prisma.cliente.findMany({
      where: { id: { in: clientesIds } },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        nit: true,
        rasonZocial: true,
        ciudad: true,
      },
    });

    const asignaciones = await this.prisma.clienteEmpresa.findMany({
      where: { empresaId, clienteId: { in: clientesIds } },
      include: { usuario: { select: { nombre: true } } },
    });

    return clientes.map((c) => {
      const asignacion = asignaciones.find((a) => a.clienteId === c.id);
      return {
        vendedor: asignacion?.usuario?.nombre || '—',
        clienteId: c.id,
        nombre: `${c.nombre} ${c.apellidos}`.trim(),
        razonSocial: c.rasonZocial,
        nit: c.nit,
        ciudad: c.ciudad,
        totalDeuda: saldoPorCliente[c.id],
      };
    });
  }

  /** ✅ Reporte de recaudo */
  async reporteRecaudo(usuario: UsuarioPayload, dto: CrearReporteInvDto) {
    const { inicio, fin } = this.normalizarRango(dto.fechaInicio, dto.fechaFin);

    const recibos = await this.prisma.recibo.findMany({
      where: {
        empresaId: usuario.empresaId,
        Fechacrecion: { gte: inicio, lte: fin },
      },
      include: {
        detalleRecibo: { select: { valorTotal: true } },
        usuario: { select: { nombre: true, apellidos: true } },
      },
    });

    return recibos.map((r) => ({
      reciboId: r.id,
      fecha: r.Fechacrecion,
      tipo: r.tipo,
      valor: r.detalleRecibo.reduce((s, d) => s + d.valorTotal, 0),
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
    const { inicio, fin } = this.normalizarRango(dto.fechaInicio, dto.fechaFin);

    const recibos = await this.prisma.recibo.findMany({
      where: {
        empresaId: usuario.empresaId,
        Fechacrecion: { gte: inicio, lte: fin },
        usuarioId: vendedorId,
      },
      include: {
        detalleRecibo: { select: { valorTotal: true } },
        usuario: { select: { nombre: true, apellidos: true } },
      },
    });

    return recibos.map((r) => ({
      reciboId: r.id,
      fecha: r.Fechacrecion,
      tipo: r.tipo,
      valor: r.detalleRecibo.reduce((s, d) => s + d.valorTotal, 0),
      concepto: r.concepto,
    }));
  }
}
