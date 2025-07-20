import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  Empresa,
  Usuario,
  Cliente,
  ClienteEmpresa,
  Proveedores,
  ProveedorEmpresa,
  CategoriasProducto,
  Producto,
  Inventario,
  Compras,
  DetalleCompra,
  Pedido,
  DetallePedido,
  EstadoPedido,
  Recibo,
  DetalleRecibo,
  MovimientosCartera,
  DetalleAjusteCartera,
  MovimientoInventario,
} from '@prisma/client';

type TipoMovimientosCreateManyInput = {
  idTipoMovimiento: string;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
};

type RespaldoData = {
  meta: { empresaId: string; timestamp: string };
  empresa: Empresa;
  usuarios: Usuario[];
  clientes: Cliente[];
  clientesEmpresa: ClienteEmpresa[];
  proveedores: Proveedores[];
  proveedoresEmpresa: ProveedorEmpresa[];
  categorias: CategoriasProducto[];
  productos: Producto[];
  inventario: Inventario[];
  compras: Compras[];
  detalleCompra: DetalleCompra[];
  pedidos: Pedido[];
  detallePedido: DetallePedido[];
  estadoPedido: EstadoPedido[];
  recibos: Recibo[];
  detalleRecibo: DetalleRecibo[];
  movimientosCartera: MovimientosCartera[];
  detalleAjusteCartera: DetalleAjusteCartera[];
  movimientosInventario: MovimientoInventario[];
  tipoMovimientos: TipoMovimientosCreateManyInput[];
};

@Injectable()
export class RespaldosService {
  constructor(private prisma: PrismaService) {}
  async eliminarRespaldosViejos(respaldoDir: string) {
    const DIAS_MAXIMOS = 7;
    const archivos = await fs.readdir(respaldoDir);

    const ahora = new Date();
    for (const archivo of archivos) {
      const ruta = path.join(respaldoDir, archivo);
      const stat = await fs.stat(ruta);

      const edadEnDias =
        (ahora.getTime() - stat.mtime.getTime()) / (1000 * 60 * 60 * 24);

      if (edadEnDias > DIAS_MAXIMOS) {
        await fs.unlink(ruta);
        console.log(`🗑️ Eliminado respaldo viejo: ${archivo}`);
      }
    }
  }

  /// genera un respaldo y lo guarda localmente

  async exportarRespaldoPorEmpresa(usuario: UsuarioPayload): Promise<Buffer> {
    if (!usuario || usuario.rol !== 'admin')
      throw new UnauthorizedException(' no esta autorizado ');
    const { empresaId } = usuario;
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });

    const usuarios = await this.prisma.usuario.findMany({
      where: { empresaId },
    });

    const clientesEmpresa = await this.prisma.clienteEmpresa.findMany({
      where: { empresaId },
      include: { cliente: true, usuario: true },
    });

    const clientes = await this.prisma.cliente.findMany({
      where: {
        empresas: {
          some: { empresaId },
        },
      },
    });

    const proveedoresEmpresa = await this.prisma.proveedorEmpresa.findMany({
      where: { empresaId },
      include: { proveedor: true },
    });

    const proveedores = await this.prisma.proveedores.findMany({
      where: {
        proveedorEmpresa: {
          some: {
            empresaId,
          },
        },
      },
    });

    const categorias = await this.prisma.categoriasProducto.findMany({
      where: { empresaId },
    });

    const productos = await this.prisma.producto.findMany({
      where: { empresaId },
    });

    const inventario = await this.prisma.inventario.findMany({
      where: { idEmpresa: empresaId },
    });

    const compras = await this.prisma.compras.findMany({
      where: { idEmpresa: empresaId },
    });

    const detalleCompra = await this.prisma.detalleCompra.findMany({
      where: {
        compra: {
          idEmpresa: empresaId,
        },
      },
    });

    const pedidos = await this.prisma.pedido.findMany({
      where: { empresaId },
    });

    const detallePedido = await this.prisma.detallePedido.findMany({
      where: {
        pedido: {
          empresaId,
        },
      },
    });

    const estadoPedido = await this.prisma.estadoPedido.findMany({
      where: {
        pedido: {
          empresaId,
        },
      },
    });

    const recibos = await this.prisma.recibo.findMany({
      where: { empresaId },
    });

    const detalleRecibo = await this.prisma.detalleRecibo.findMany({
      where: {
        recibo: {
          empresaId,
        },
      },
    });

    const movimientosCartera = await this.prisma.movimientosCartera.findMany({
      where: { empresaId },
    });

    const detalleAjusteCartera =
      await this.prisma.detalleAjusteCartera.findMany({
        where: {
          movimiento: {
            empresaId,
          },
        },
      });

    const movimientosInventario =
      await this.prisma.movimientoInventario.findMany({
        where: { idEmpresa: empresaId },
      });

    const tipoMovimientos = await this.prisma.tipoMovimientos.findMany();

    const respaldo = {
      meta: {
        empresaId,
        timestamp: new Date().toISOString(),
      },
      empresa,
      usuarios,
      clientes,
      clientesEmpresa,
      proveedores,
      proveedoresEmpresa,
      categorias,
      productos,
      inventario,
      compras,
      detalleCompra,
      pedidos,
      detallePedido,
      estadoPedido,
      recibos,
      detalleRecibo,
      movimientosCartera,
      detalleAjusteCartera,
      movimientosInventario,
      tipoMovimientos,
    };

    return Buffer.from(JSON.stringify(respaldo, null, 2));
  }
  async exportarRespaldoYGuardar(
    usuario: UsuarioPayload
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const jsonBuffer = await this.exportarRespaldoPorEmpresa(usuario);

    // 🔒 Codificar en base64
    const base64String = jsonBuffer.toString('base64');
    const buffer = Buffer.from(base64String);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `respaldo-${timestamp}.backup`;

    return { buffer, fileName };
  }
  async restaurarDesdeRespaldo(usuario: UsuarioPayload, base64: string) {
    if (!usuario || usuario.rol !== 'admin') {
      throw new UnauthorizedException('No autorizado');
    }

    const { empresaId } = usuario;

    const jsonString = Buffer.from(base64, 'base64').toString('utf-8');
    const data = JSON.parse(jsonString) as RespaldoData;

    if (data.meta?.empresaId !== empresaId) {
      throw new UnauthorizedException(
        'El respaldo no pertenece a esta empresa'
      );
    }

    // 🧹 Eliminación ordenada
    await this.prisma.$transaction(async (tx) => {
      const idsPedidos = data.pedidos.map((p) => p.id);
      const idsUsuarios = data.usuarios?.map((u) => u.id) || [];
      const idsClientes = data.clientes.map((c) => c.id);
      const idsProveedores = data.proveedores.map((p) => p.idProveedor);
      const idsCompras = data.compras.map((c) => c.idCompra);
      const idsMovimientos = data.movimientosCartera.map(
        (m) => m.idMovimientoCartera
      );

      await tx.detalleAjusteCartera.deleteMany({
        where: { idMovimiento: { in: idsMovimientos } },
      });

      const recibosEmpresa = await tx.recibo.findMany({
        where: { empresaId },
        select: { id: true },
      });
      const idsRecibosEmpresa = recibosEmpresa.map((r) => r.id);

      await tx.detalleRecibo.deleteMany({
        where: { idRecibo: { in: idsRecibosEmpresa } },
      });
      await tx.recibo.deleteMany({ where: { id: { in: idsRecibosEmpresa } } });

      await tx.movimientosCartera.deleteMany({ where: { empresaId } });
      await tx.estadoPedido.deleteMany({
        where: { pedidoId: { in: idsPedidos } },
      });
      await tx.detallePedido.deleteMany({
        where: { pedidoId: { in: idsPedidos } },
      });

      const pedidosEmpresa = await tx.pedido.findMany({
        where: { empresaId },
        select: { id: true },
      });
      const idsPedidosEmpresa = pedidosEmpresa.map((p) => p.id);
      await tx.detalleRecibo.deleteMany({
        where: { idPedido: { in: idsPedidosEmpresa } },
      });
      await tx.pedido.deleteMany({ where: { id: { in: idsPedidosEmpresa } } });

      await tx.detalleCompra.deleteMany({
        where: { idCompra: { in: idsCompras } },
      });
      await tx.compras.deleteMany({ where: { idCompra: { in: idsCompras } } });

      await tx.movimientoInventario.deleteMany({
        where: { idEmpresa: empresaId },
      });
      await tx.inventario.deleteMany({ where: { idEmpresa: empresaId } });

      await tx.producto.deleteMany({ where: { empresaId } });
      await tx.categoriasProducto.deleteMany({ where: { empresaId } });

      await tx.clienteEmpresa.deleteMany({ where: { empresaId } });
      await tx.proveedorEmpresa.deleteMany({ where: { empresaId } });

      await tx.recibo.deleteMany({ where: { usuarioId: { in: idsUsuarios } } });

      await tx.cliente.deleteMany({ where: { id: { in: idsClientes } } });
      await tx.proveedores.deleteMany({
        where: { idProveedor: { in: idsProveedores } },
      });
    });

    // ✅ Inserción
    await this.prisma.$transaction(async (tx) => {
      await tx.cliente.createMany({
        data: data.clientes,
        skipDuplicates: true,
      });

      const clientesEmpresaFlat = data.clientesEmpresa.map((c) => ({
        id: c.id,
        clienteId: c.clienteId,
        empresaId: c.empresaId,
        usuarioId: c.usuarioId,
      }));
      await tx.clienteEmpresa.createMany({
        data: clientesEmpresaFlat,
        skipDuplicates: true,
      });

      await tx.proveedores.createMany({
        data: data.proveedores,
        skipDuplicates: true,
      });
      await tx.proveedorEmpresa.createMany({
        data: data.proveedoresEmpresa,
        skipDuplicates: true,
      });

      await tx.categoriasProducto.createMany({
        data: data.categorias,
        skipDuplicates: true,
      });
      await tx.producto.createMany({
        data: data.productos,
        skipDuplicates: true,
      });
      await tx.inventario.createMany({
        data: data.inventario,
        skipDuplicates: true,
      });
      await tx.compras.createMany({ data: data.compras, skipDuplicates: true });
      await tx.detalleCompra.createMany({
        data: data.detalleCompra,
        skipDuplicates: true,
      });
      await tx.tipoMovimientos.createMany({
        data: data.tipoMovimientos,
        skipDuplicates: true,
      });

      await tx.pedido.createMany({ data: data.pedidos, skipDuplicates: true });
      await tx.detallePedido.createMany({
        data: data.detallePedido,
        skipDuplicates: true,
      });
      await tx.estadoPedido.createMany({
        data: data.estadoPedido,
        skipDuplicates: true,
      });
      // const idsPedidosValidos = data.movimientosInventario
      //   .map((m) => m.IdPedido)
      //   .filter((id): id is string => id !== null);

      // const pedidosExistentes = await tx.pedido.findMany({
      //   where: {
      //     id: {
      //       in: data.movimientosInventario.map((m) => m.IdPedido),
      //     },
      //   },
      //   select: { id: true },
      // });
      // const pedidosValidos = new Set(pedidosExistentes.map((p) => p.id));
      // const movimientosValidos = data.movimientosInventario.filter((m) =>
      //   pedidosValidos.has(m.IdPedido)
      // );

      await tx.movimientoInventario.createMany({
        data: data.movimientosInventario.filter((m) => m.IdPedido !== null),
        skipDuplicates: true,
      });

      await tx.recibo.createMany({ data: data.recibos, skipDuplicates: true });
      await tx.detalleRecibo.createMany({
        data: data.detalleRecibo,
        skipDuplicates: true,
      });

      await tx.movimientosCartera.createMany({
        data: data.movimientosCartera,
        skipDuplicates: true,
      });
      await tx.detalleAjusteCartera.createMany({
        data: data.detalleAjusteCartera,
        skipDuplicates: true,
      });
    });
  }
}
