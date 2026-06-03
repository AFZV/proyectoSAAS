import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from 'src/prisma/prisma.service';
import { HetznerStorageService } from 'src/hetzner-storage/hetzner-storage.service';
import {
  Empresa,
  Usuario,
  CategoriasProducto,
  Cliente,
  ClienteEmpresa,
  Proveedores,
  ProveedorEmpresa,
  Producto,
  Inventario,
  Pedido,
  DetallePedido,
  EstadoPedido,
  Recibo,
  DetalleRecibo,
  Compras,
  DetalleCompra,
  MovimientoInventario,
  TipoMovimientos,
  MovimientosCartera,
  DetalleAjusteCartera,
  PagoProveedor,
  DetallePagoProveedor,
  FacturaCompra,
  FacturaProveedor,
  ProductoImagen,
} from '@prisma/client';

interface BackupData {
  empresa: Empresa | null;
  usuarios: Usuario[];
  tipoMovimientos: TipoMovimientos[];
  categoriasProducto: CategoriasProducto[];
  clientes: Cliente[];
  clienteEmpresa: ClienteEmpresa[];
  proveedores: Proveedores[];
  proveedorEmpresa: ProveedorEmpresa[];
  productos: Producto[];
  inventario: Inventario[];
  pedidos: Pedido[];
  detallePedido: DetallePedido[];
  estadoPedido: EstadoPedido[];
  recibos: Recibo[];
  detalleRecibo: DetalleRecibo[];
  compras: Compras[];
  detalleCompra: DetalleCompra[];
  movimientoInventario: MovimientoInventario[];
  movimientosCartera: MovimientosCartera[];
  detalleAjusteCartera: DetalleAjusteCartera[];
  detallesPagoProveedor?: DetallePagoProveedor[];
  pagosProveedor?: PagoProveedor[];
  facturaCompra?: FacturaCompra[];
  facturaProveedor?: FacturaProveedor[];
  productoImagenes?: ProductoImagen[];
}

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

@Injectable()
export class RespaldosService {
  private readonly logger = new Logger(RespaldosService.name);
  private readonly uploadDir = path.resolve('./uploads');
  private readonly s3Folder = 'backups';

  constructor(
    private prisma: PrismaService,
    private hetzner: HetznerStorageService,
  ) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async generarRespaldoEmpresa(empresaId: string): Promise<{
    fileName: string;
    key: string;
    dia: string;
  }> {
    const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    const dia = DIAS_SEMANA[ahora.getDay()];
    const fileName = `backup-${dia}.sql`; // Se pisa cada semana → máximo 7 archivos

    // ── 1. Empresa ──────────────────────────────────────────────────────────────
    const empresa = await this.prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) throw new Error(`Empresa ${empresaId} no encontrada`);

    // ── 2. Recolectar tablas que contienen FKs hacia entidades compartidas ──────
    const usuarios = await this.prisma.usuario.findMany({ where: { empresaId } });

    const compras = await this.prisma.compras.findMany({ where: { idEmpresa: empresaId } });

    const pedidos = await this.prisma.pedido.findMany({ where: { empresaId } });

    const detallePedido = await this.prisma.detallePedido.findMany({
      where: { pedido: { empresaId } },
    });

    const detalleCompra = await this.prisma.detalleCompra.findMany({
      where: { compra: { idEmpresa: empresaId } },
    });

    const movimientoInventario = await this.prisma.movimientoInventario.findMany({
      where: { idEmpresa: empresaId },
    });

    // ── 3. Extraer IDs huérfanos (entidades compartidas entre empresas) ──────────
    const clienteIdsExtra = usuarios
      .map((u) => u.clienteId)
      .filter((id): id is string => !!id);

    const proveedorIdsExtra = compras
      .map((c) => (c as any).idProveedor as string)
      .filter((id): id is string => !!id);

    const productoIdsExtra = [
      ...detallePedido.map((d) => d.productoId),
      ...detalleCompra.map((d) => d.idProducto),
      ...movimientoInventario.map((d) => d.idProducto),
    ].filter((id, i, arr) => arr.indexOf(id) === i);

    // ── 4. Consultas incluyendo entidades huérfanas ─────────────────────────────
    const clientes = await this.prisma.cliente.findMany({
      where: {
        OR: [
          { empresas: { some: { empresaId } } },
          ...(clienteIdsExtra.length ? [{ id: { in: clienteIdsExtra } }] : []),
        ],
      },
    });

    const proveedores = await this.prisma.proveedores.findMany({
      where: {
        OR: [
          { proveedorEmpresa: { some: { empresaId } } },
          ...(proveedorIdsExtra.length ? [{ idProveedor: { in: proveedorIdsExtra } }] : []),
        ],
      },
    });

    const productos = await this.prisma.producto.findMany({
      where: {
        OR: [
          { empresaId },
          ...(productoIdsExtra.length ? [{ id: { in: productoIdsExtra } }] : []),
        ],
      },
    });

    // ── 5. Resto de tablas simples ──────────────────────────────────────────────
    const backupData: BackupData = {
      empresa,
      usuarios,
      compras,
      pedidos,
      detallePedido,
      detalleCompra,
      movimientoInventario,
      clientes,
      proveedores,
      productos,
      tipoMovimientos: await this.prisma.tipoMovimientos.findMany(),
      categoriasProducto: await this.prisma.categoriasProducto.findMany({
        where: { empresaId },
      }),
      clienteEmpresa: await this.prisma.clienteEmpresa.findMany({
        where: { empresaId },
      }),
      proveedorEmpresa: await this.prisma.proveedorEmpresa.findMany({
        where: { empresaId },
      }),
      productoImagenes: await this.prisma.productoImagen.findMany({
        where: { producto: { empresaId } },
      }),
      inventario: await this.prisma.inventario.findMany({
        where: { idEmpresa: empresaId },
      }),
      estadoPedido: await this.prisma.estadoPedido.findMany({
        where: { pedido: { empresaId } },
      }),
      recibos: await this.prisma.recibo.findMany({ where: { empresaId } }),
      detalleRecibo: await this.prisma.detalleRecibo.findMany({
        where: { recibo: { empresaId } },
      }),
      movimientosCartera: await this.prisma.movimientosCartera.findMany({
        where: { empresaId },
      }),
      detalleAjusteCartera: await this.prisma.detalleAjusteCartera.findMany({
        where: { movimiento: { empresaId } },
      }),
      pagosProveedor: await this.prisma.pagoProveedor.findMany({
        where: { empresaId },
      }),
      detallesPagoProveedor: await this.prisma.detallePagoProveedor.findMany({
        where: { pago: { empresaId } },
      }),
      facturaCompra: await this.prisma.facturaCompra.findMany({
        where: { compra: { idEmpresa: empresaId } },
      }),
      facturaProveedor: await this.prisma.facturaProveedor.findMany({
        where: { empresaId },
      }),
    };

    const sqlScript = this.generarSQLConUpsert(backupData);
    const buffer = Buffer.from(sqlScript, 'utf-8');
    const key = await this.hetzner.uploadPrivateBuffer(buffer, fileName, `${this.s3Folder}/${empresaId}`);

    this.logger.log(`Respaldo OK: ${key} (${buffer.length} bytes) — día: ${dia}`);
    return { fileName, key, dia };
  }

  async listarRespaldos(empresaId: string): Promise<{ key: string; fileName: string; size: number; fecha: Date }[]> {
    const items = await this.hetzner.listFolder(`${this.s3Folder}/${empresaId}`);
    return items.map((item) => ({
      key: item.key,
      fileName: item.key.split('/').pop() ?? item.key,
      size: item.size,
      fecha: item.lastModified,
    }));
  }

  async getUrlDescarga(key: string): Promise<string> {
    return this.hetzner.getSignedDownloadUrl(key, 3600);
  }

  @Cron('0 2 * * *', { name: 'backup-automatico', timeZone: 'America/Bogota' })
  async respaldoAutomatico() {
    const empresaId = process.env.INSTANCE_EMPRESA_ID;
    if (!empresaId) {
      this.logger.warn('INSTANCE_EMPRESA_ID no configurado — respaldo automático omitido');
      return;
    }
    try {
      const { key, dia } = await this.generarRespaldoEmpresa(empresaId);
      this.logger.log(`Respaldo automático OK [${dia}]: ${key}`);
    } catch (err) {
      this.logger.error('Error en respaldo automático', (err as Error).message);
    }
  }

  private generarSQLConUpsert(data: BackupData): string {
    const lines: string[] = [];
    lines.push('-- Respaldo generado automáticamente con UPSERT\n');
    lines.push('BEGIN;');
    lines.push('SET session_replication_role = replica; -- deshabilita FKs (requiere superuser, ignorado si no aplica)');
    lines.push('SET CONSTRAINTS ALL DEFERRED; -- fallback: difiere FKs al final de la transacción');

    const generarInsert = (
      table: string,
      rows: Array<Record<string, unknown>>,
      pk: string,
    ) => {
      for (const row of rows) {
        const keys = Object.keys(row);
        const values = keys
          .map((key) => {
            const val = row[key];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === 'bigint') return val.toString();
            if (typeof val === 'number') return val;
            return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          })
          .join(', ');

        const updateSet = keys
          .filter((k) => k !== pk)
          .map((k) => `"${k}" = EXCLUDED."${k}"`)
          .join(', ');

        lines.push(
          `INSERT INTO "${table}" (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${values}) ON CONFLICT ("${pk}") DO UPDATE SET ${updateSet};`,
        );
      }
    };

    if (data.empresa) generarInsert('Empresa', [data.empresa as Record<string, unknown>], 'id');
    if (data.tipoMovimientos.length) generarInsert('TipoMovimientos', data.tipoMovimientos, 'idTipoMovimiento');
    if (data.categoriasProducto.length) generarInsert('CategoriasProducto', data.categoriasProducto, 'idCategoria');
    if (data.clientes.length) generarInsert('Cliente', data.clientes, 'id');
    if (data.usuarios.length) generarInsert('Usuario', data.usuarios, 'id');
    if (data.clienteEmpresa.length) generarInsert('ClienteEmpresa', data.clienteEmpresa, 'id');
    if (data.proveedores.length) generarInsert('Proveedores', data.proveedores, 'idProveedor');
    if (data.proveedorEmpresa.length) generarInsert('ProveedorEmpresa', data.proveedorEmpresa, 'idProveedorEmpresa');
    if (data.productos.length) generarInsert('Producto', data.productos, 'id');
    if (data.productoImagenes?.length) generarInsert('ProductoImagen', data.productoImagenes, 'id');
    if (data.inventario.length) generarInsert('Inventario', data.inventario, 'idInventario');
    if (data.compras.length) generarInsert('Compras', data.compras, 'idCompra');
    if (data.detalleCompra.length) generarInsert('DetalleCompra', data.detalleCompra, 'idDetalleCompra');
    if (data.pedidos.length) generarInsert('Pedido', data.pedidos, 'id');
    if (data.detallePedido.length) generarInsert('DetallePedido', data.detallePedido, 'id');
    if (data.estadoPedido.length) generarInsert('EstadoPedido', data.estadoPedido, 'id');
    if (data.recibos.length) generarInsert('Recibo', data.recibos, 'id');
    if (data.detalleRecibo.length) generarInsert('DetalleRecibo', data.detalleRecibo, 'idDetalleRecibo');
    if (data.movimientoInventario.length) generarInsert('MovimientoInventario', data.movimientoInventario, 'idMovimiento');
    if (data.movimientosCartera.length) generarInsert('MovimientosCartera', data.movimientosCartera, 'idMovimientoCartera');
    if (data.detalleAjusteCartera.length) generarInsert('DetalleAjusteCartera', data.detalleAjusteCartera, 'idDetalleAjuste');
    if (data.facturaProveedor?.length) generarInsert('FacturaProveedor', data.facturaProveedor, 'idFacturaProveedor');
    if (data.facturaCompra?.length) generarInsert('FacturaCompra', data.facturaCompra, 'idFacturaCompra');
    if (data.pagosProveedor?.length) generarInsert('PagoProveedor', data.pagosProveedor, 'idPagoProveedor');
    if (data.detallesPagoProveedor?.length) generarInsert('DetallePagoProveedor', data.detallesPagoProveedor, 'idDetallePagoProveedor');

    lines.push('SET session_replication_role = DEFAULT;');
    lines.push('COMMIT;');
    return lines.join('\n');
  }
}
