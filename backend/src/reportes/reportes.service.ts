import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { CrearReporteInvDto } from './dto/crear-reporte-inventario.dto';
import { CrearReporteClienteCiudadDto } from './dto/crear-reporte-clientciudad-dto';
import { CrearReporteVentasProductoDto } from './dto/crear-reporte-ventas-producto.dto';

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
        // estado: 'activo',
        inventario: { some: { stockActual: { gt: 0 } } },
      },
      orderBy: { nombre: 'asc' },
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
      orderBy: { nombre: 'asc' },
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

  // productos por palabra clave
  async buscarProductosPorNombre(
    palabraClave: string,
    usuario: UsuarioPayload
  ) {
    const { empresaId } = usuario;
    const productosRaw = await this.prisma.producto.findMany({
      where: {
        empresaId, // 👈 si quieres filtrar solo dentro de la empresa
        nombre: {
          contains: palabraClave,
          mode: 'insensitive', // 👈 para que no importe mayúscula/minúscula
        },
      },
      include: { inventario: { select: { stockActual: true } } },
      orderBy: {
        nombre: 'asc', // opcional: orden alfabético
      },
    });
    const productosFiltrados = productosRaw.map((p) => ({
      nombre: p.nombre.trimStart(),
      precioCompra: p.precioCompra,
      stock: p.inventario?.[0]?.stockActual ?? 0,
    }));

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
        total: { gt: 0 },
        estados: { some: { estado: 'FACTURADO' } },
      },
      include: {
        cliente: {
          select: { nombre: true, apellidos: true, rasonZocial: true },
        },
        usuario: { select: { nombre: true } },
      },
    });

    return pedidos.map((p) => ({
      id: p.id.slice(0, 6),
      nombre: p.cliente.nombre,
      apellidos: p.cliente.apellidos,
      rasonZocial: p.cliente.rasonZocial,
      fecha: p.fechaActualizado || p.fechaPedido,
      total: p.total,
      vendedor: p.usuario.nombre,
      flete: p.flete || 0,
      comision: p.comisionVendedor || 0,
      //proximamente descuento: p.descuento || 0, // <-- cuando agregues el campo descuento en pedidos
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
        total: { gt: 0 },
        estados: {
          some: {
            estado: 'FACTURADO',
            fechaEstado: { gte: inicio, lte: fin }, // si usas semiabierto: { gte: inicio, lt: finSiguiente }
          },
        },
      },
      include: {
        cliente: {
          select: { nombre: true, apellidos: true, rasonZocial: true },
        },
        // Traer la fecha exacta de facturación
        estados: {
          where: { estado: 'FACTURADO' },
          orderBy: { fechaEstado: 'desc' },
          take: 1,
          select: { fechaEstado: true },
        },
      },
    });

    return pedidos.map((p) => ({
      id: p.id.slice(0, 6),
      nombre: p.cliente.nombre,
      apellidos: p.cliente.apellidos,
      rasonZocial: p.cliente.rasonZocial,
      fechaPedido: p.fechaPedido,
      fechaFacturacion: p.estados[0]?.fechaEstado ?? null,
      total: p.total,
      flete: p.flete || 0,
      comision: p.comisionVendedor || 0,
      //proximamente descuento: p.descuento || 0, // <-- cuando agregues el campo descuento en pedidos
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
        total: { gt: 0 },
        estados: {
          some: {
            estado: 'FACTURADO',
            fechaEstado: { gte: inicio, lte: fin }, // si usas semiabierto: { gte: inicio, lt: finSiguiente }
          },
        },
      },
      include: {
        cliente: {
          select: { nombre: true, apellidos: true, rasonZocial: true },
        },
        detalleRecibo: { select: { valorTotal: true } },
        detalleAjusteCartera: { select: { valor: true } },
        usuario: { select: { nombre: true } },
      },
    });

    return pedidos
      .map((p) => {
        const abonado = p.detalleRecibo.reduce((s, d) => s + d.valorTotal, 0);
        const ajustes = p.detalleAjusteCartera.reduce((s, d) => s + d.valor, 0);
        const saldoPendiente = p.total - abonado - ajustes;

        return {
          id: p.id.slice(0, 6),
          nombre: p.cliente.nombre,
          apellidos: p.cliente.apellidos,
          rasonZocial: p.cliente.rasonZocial,
          fecha: p.fechaPedido,
          vendedor: p.usuario.nombre,
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
        usuarioId: vendedorId, // respeta vendedor
        total: { gt: 0 },
        estados: {
          some: {
            estado: 'FACTURADO',
            fechaEstado: { gte: inicio, lte: fin }, // ← rango por FACTURADO
            // si prefieres semiabierto: { gte: inicio, lt: finSiguiente }
          },
        },
      },
      include: {
        cliente: {
          select: { nombre: true, apellidos: true, rasonZocial: true },
        },
        detalleRecibo: { select: { valorTotal: true } },
        detalleAjusteCartera: { select: { valor: true } },
      },
    });

    return pedidos
      .map((p) => {
        const abonado = p.detalleRecibo.reduce(
          (s, d) => s + Number(d.valorTotal || 0),
          0
        );
        const ajustes = p.detalleAjusteCartera.reduce(
          (s, d) => s + Number(d.valor || 0),
          0
        );
        const saldoPendiente = Math.max(
          0,
          Number(p.total || 0) - abonado - ajustes
        );

        return {
          id: p.id.slice(0, 6),
          nombre: p.cliente.nombre,
          apellidos: p.cliente.apellidos,
          rasonZocial: p.cliente.rasonZocial,
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
        detalleRecibo: {
          select: {
            valorTotal: true,
            pedido: { select: { comisionVendedor: true } },
          },
        },
        usuario: { select: { nombre: true, apellidos: true } },
        cliente: {
          select: { nombre: true, apellidos: true, rasonZocial: true },
        },
      },
    });

    return recibos.map((r) => {
      const totalRecaudo = r.detalleRecibo.reduce(
        (s, d) => s + d.valorTotal,
        0
      );

      // Suma de comisiones por detalle (sobre lo recaudado)
      const comisionLiquidada = r.detalleRecibo.reduce((s, d) => {
        const pct = d.pedido?.comisionVendedor ?? 0;
        return s + (d.valorTotal * pct) / 100;
      }, 0);

      // Promedio ponderado del % de comisión por valor recaudado
      // const porcentajeComision =
      //   totalRecaudo > 0
      //     ? r.detalleRecibo.reduce((s, d) => {
      //         const pct = d.pedido?.comisionVendedor ?? 0;
      //         return s + d.valorTotal * pct;
      //       }, 0) / totalRecaudo
      //     : 0;

      return {
        reciboId: r.id.slice(0, 5),
        fecha: r.Fechacrecion,
        tipo: r.tipo,
        cliente: `${r.cliente.nombre} ${r.cliente.apellidos}`.trim(),
        rasonZocial: r.cliente.rasonZocial,
        valor: totalRecaudo,
        vendedor: `${r.usuario.nombre} ${r.usuario.apellidos}`.trim(),
        concepto: r.concepto,
        estado: r.revisado ? 'revisado' : 'pendiente',

        // 🔽 Solo campos de comisión (agregados a tu return)
        //  porcentajeComision, // % equivalente ponderado por recaudo
        comisionLiquidada, // suma de comisiones liquidadas
      };
    });
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
        detalleRecibo: {
          select: {
            valorTotal: true,
            pedido: { select: { comisionVendedor: true } },
          },
        },
        usuario: { select: { nombre: true, apellidos: true } },
        cliente: {
          select: { nombre: true, apellidos: true, rasonZocial: true },
        },
      },
    });
    return recibos.map((r) => {
      const totalRecaudo = r.detalleRecibo.reduce(
        (s, d) => s + d.valorTotal,
        0
      );

      // Suma de comisiones por detalle (sobre lo recaudado)
      const comisionLiquidada = r.detalleRecibo.reduce((s, d) => {
        const pct = d.pedido?.comisionVendedor ?? 0;
        return s + (d.valorTotal * pct) / 100;
      }, 0);

      // Promedio ponderado del % de comisión por valor recaudado
      // const porcentajeComision =
      //   totalRecaudo > 0
      //     ? r.detalleRecibo.reduce((s, d) => {
      //         const pct = d.pedido?.comisionVendedor ?? 0;
      //         return s + d.valorTotal * pct;
      //       }, 0) / totalRecaudo
      //     : 0;

      return {
        reciboId: r.id.slice(0, 5),
        fecha: r.Fechacrecion,
        tipo: r.tipo,
        cliente: `${r.cliente.nombre} ${r.cliente.apellidos}`.trim(),
        rasonZocial: r.cliente.rasonZocial,
        valor: totalRecaudo,
        vendedor: `${r.usuario.nombre} ${r.usuario.apellidos}`.trim(),
        concepto: r.concepto,
        estado: r.revisado ? 'revisado' : 'pendiente',

        // 🔽 Solo campos de comisión (agregados a tu return)
        //porcentajeComision, // % equivalente ponderado por recaudo
        comisionLiquidada, // suma de comisiones liquidadas
      };
    });
  }
  // Devuelve fletes de pedidos con saldo pendiente (sin filtro de fechas)
  // Devuelve fletes de pedidos con saldo pendiente (sin filtro de fechas)
  async fletesPendientesTotales(usuario: UsuarioPayload) {
    const pedidos = await this.prisma.pedido.findMany({
      where: {
        empresaId: usuario.empresaId,
        total: { gt: 0 },
        // Solo pedidos facturados (como en tus otros reportes)
        estados: { some: { estado: 'ENVIADO' } },
      },
      include: {
        cliente: {
          select: {
            nombre: true,
            apellidos: true,
            rasonZocial: true,
            nit: true,
            ciudad: true,
          },
        },
        usuario: { select: { nombre: true } },
        detalleRecibo: { select: { valorTotal: true } },
        detalleAjusteCartera: { select: { valor: true } },
      },
    });

    const rows = pedidos
      .map((p) => {
        const abonado = p.detalleRecibo.reduce(
          (s, d) => s + Number(d.valorTotal || 0),
          0
        );
        const ajustes = p.detalleAjusteCartera.reduce(
          (s, d) => s + Number(d.valor || 0),
          0
        );
        const total = Number(p.total || 0);
        const saldoPendiente = Math.max(0, total - abonado - ajustes);

        const flete = p.flete || 0; // 👈 renombra si tu columna se llama distinto

        return {
          id: p.id.slice(0, 6),
          fecha: p.fechaPedido,
          nombre: p.cliente.nombre,
          apellidos: p.cliente.apellidos,
          rasonZocial: p.cliente.rasonZocial,
          nit: p.cliente.nit,
          ciudad: p.cliente.ciudad,
          vendedor: p.usuario?.nombre ?? '—',
          flete,
          saldoPendiente,
        };
      })
      .filter((x) => x.saldoPendiente > 0); // Solo pendientes

    return rows;
  }

  // Devuelve fletes de pedidos con saldo pendiente por rango de fechas
  async fletesPendientesPorRango(
    usuario: UsuarioPayload,
    dto: CrearReporteInvDto
  ) {
    const { inicio, fin } = this.normalizarRango(dto.fechaInicio, dto.fechaFin);

    const pedidos = await this.prisma.pedido.findMany({
      where: {
        empresaId: usuario.empresaId,
        total: { gt: 0 },
        fechaPedido: { gte: inicio, lte: fin }, // 👈 rango por fecha de pedido
        estados: { some: { estado: 'ENVIADO' } },
      },
      include: {
        cliente: {
          select: {
            nombre: true,
            apellidos: true,
            rasonZocial: true,
            nit: true,
            ciudad: true,
          },
        },
        usuario: { select: { nombre: true } },
        detalleRecibo: { select: { valorTotal: true } },
        detalleAjusteCartera: { select: { valor: true } },
      },
    });

    const rows = pedidos
      .map((p) => {
        const abonado = p.detalleRecibo.reduce(
          (s, d) => s + Number(d.valorTotal || 0),
          0
        );
        const ajustes = p.detalleAjusteCartera.reduce(
          (s, d) => s + Number(d.valor || 0),
          0
        );
        const total = Number(p.total || 0);
        const saldoPendiente = Math.max(0, total - abonado - ajustes);

        const flete = p.flete || 0; // 👈 renombra si tu campo se llama distinto

        return {
          id: p.id.slice(0, 6),
          fecha: p.fechaPedido,
          nombre: p.cliente.nombre,
          apellidos: p.cliente.apellidos,
          rasonZocial: p.cliente.rasonZocial,
          nit: p.cliente.nit,
          ciudad: p.cliente.ciudad,
          vendedor: p.usuario?.nombre ?? '—',
          flete,
          total,
          abonado,
          saldoPendiente,
        };
      })
      .filter((x) => x.saldoPendiente > 0);

    return rows;
  }
  /** ✅ Reporte de ventas por producto */
  async pedidosVentasPorProducto(
    usuario: UsuarioPayload,
    dto: CrearReporteVentasProductoDto
  ) {
    const { empresaId } = usuario;
    if (!empresaId) throw new BadRequestException('empresaId requerido');

    const { inicio, fin } = this.normalizarRango(dto.fechaInicio, dto.fechaFin);

    // 👇 Ajusta nombres de modelo/campos si tu Prisma cambia:
    const detalles = await this.prisma.detallePedido.findMany({
      where: {
        productoId: dto.productoId,
        pedido: {
          empresaId,
          total: { gt: 0 },
          estados: {
            some: {
              estado: 'FACTURADO',
              fechaEstado: { gte: inicio, lte: fin },
            },
          },
        },
      },
      include: {
        pedido: {
          select: {
            id: true,
            fechaPedido: true,
            estados: {
              where: { estado: 'FACTURADO' },
              orderBy: { fechaEstado: 'desc' },
              take: 1,
              select: { fechaEstado: true },
            },
            cliente: {
              select: {
                nombre: true,
                apellidos: true,
                rasonZocial: true,
              },
            },
            usuario: {
              select: {
                nombre: true,
                apellidos: true,
              },
            },
          },
        },
        producto: {
          select: {
            nombre: true,
            codigo: true,
            precioCompra: true,
            precioVenta: true,
          },
        },
      },
    });

    // Ordenar por fecha de facturación (o fechaPedido si no hay estado)
    detalles.sort((a, b) => {
      const fa =
        a.pedido.estados[0]?.fechaEstado ?? a.pedido.fechaPedido ?? new Date(0);
      const fb =
        b.pedido.estados[0]?.fechaEstado ?? b.pedido.fechaPedido ?? new Date(0);
      return fa.getTime() - fb.getTime();
    });

    // Mapear a filas para Excel
    return detalles.map((d) => {
      const cantidad = Number(d.cantidad || 0); // 👈 ajusta si tu campo se llama diferente
      const precioCompra = Number(d.producto?.precioCompra ?? 0);
      const precioVenta =
        d.precio !== undefined
          ? Number(d.precio)
          : Number(d.producto?.precioVenta ?? 0);

      const totalLinea = cantidad * precioVenta;
      const utilidad = (precioVenta - precioCompra) * cantidad;

      const fecha =
        d.pedido.estados[0]?.fechaEstado ?? d.pedido.fechaPedido ?? null;

      return {
        // 🔑 Claves que usará el controller en columns[]
        fecha,
        pedidoId: d.pedido.id.slice(0, 6),
        cliente:
          `${d.pedido.cliente.nombre} ${d.pedido.cliente.apellidos}`.trim(),
        rasonZocial: d.pedido.cliente.rasonZocial,
        vendedor: `${d.pedido.usuario?.nombre || ''} ${
          d.pedido.usuario?.apellidos || ''
        }`.trim(),
        codigoProducto: d.producto?.codigo,
        nombreProducto: d.producto?.nombre,
        cantidad,
        precioCompra,
        precioVenta,
        totalLinea,
        utilidad,
      };
    });
  }
}
