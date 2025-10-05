import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from 'src/prisma/prisma.service';
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
}

@Injectable()
export class RespaldosService {
  private uploadDir = path.resolve('./uploads');

  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * ✅ Generar respaldo JSON y SQL para una empresa específica.
   * Archivo SQL incluye UPSERT (INSERT ON CONFLICT DO UPDATE)
   */
  async generarRespaldoEmpresa(empresaId: string): Promise<{
    jsonPath: string;
    sqlPath: string;
    fileNameJson: string;
    fileNameSql: string;
  }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    const fileNameJson = `backup-empresa-${empresaId}-${timestamp}.json`;
    const fileNameSql = `backup-empresa-${empresaId}-${timestamp}.sql`;

    const jsonPath = path.join(this.uploadDir, fileNameJson);
    const sqlPath = path.join(this.uploadDir, fileNameSql);

    const backupData: BackupData = {
      empresa: null,
      usuarios: [],
      tipoMovimientos: [],
      categoriasProducto: [],
      clientes: [],
      clienteEmpresa: [],
      proveedores: [],
      proveedorEmpresa: [],
      productos: [],
      inventario: [],
      pedidos: [],
      detallePedido: [],
      estadoPedido: [],
      recibos: [],
      detalleRecibo: [],
      compras: [],
      detalleCompra: [],
      movimientoInventario: [],
      movimientosCartera: [],
      detalleAjusteCartera: [],
      detallesPagoProveedor: [],
      pagosProveedor: [],
      facturaCompra: [],
      facturaProveedor: [],
    };

    try {
      // ✅ 1. Obtener todos los datos
      const empresa = await this.prisma.empresa.findUnique({
        where: { id: empresaId },
      });
      if (!empresa) throw new Error(`Empresa ${empresaId} no encontrada`);
      backupData.empresa = empresa;

      backupData.tipoMovimientos = await this.prisma.tipoMovimientos.findMany();
      backupData.usuarios = await this.prisma.usuario.findMany({
        where: { empresaId },
      });
      backupData.categoriasProducto =
        await this.prisma.categoriasProducto.findMany({ where: { empresaId } });
      backupData.clientes = await this.prisma.cliente.findMany({
        where: { empresas: { some: { empresaId } } },
      });
      backupData.clienteEmpresa = await this.prisma.clienteEmpresa.findMany({
        where: { empresaId },
      });
      backupData.proveedores = await this.prisma.proveedores.findMany({
        where: { proveedorEmpresa: { some: { empresaId } } },
      });
      backupData.proveedorEmpresa = await this.prisma.proveedorEmpresa.findMany(
        { where: { empresaId } }
      );
      backupData.productos = await this.prisma.producto.findMany({
        where: { empresaId },
      });
      backupData.inventario = await this.prisma.inventario.findMany({
        where: { idEmpresa: empresaId },
      });
      backupData.compras = await this.prisma.compras.findMany({
        where: { idEmpresa: empresaId },
      });
      backupData.detalleCompra = await this.prisma.detalleCompra.findMany({
        where: { compra: { idEmpresa: empresaId } },
      });
      backupData.pedidos = await this.prisma.pedido.findMany({
        where: { empresaId },
      });
      backupData.detallePedido = await this.prisma.detallePedido.findMany({
        where: { pedido: { empresaId } },
      });
      backupData.estadoPedido = await this.prisma.estadoPedido.findMany({
        where: { pedido: { empresaId } },
      });
      backupData.recibos = await this.prisma.recibo.findMany({
        where: { empresaId },
      });
      backupData.detalleRecibo = await this.prisma.detalleRecibo.findMany({
        where: { recibo: { empresaId } },
      });
      backupData.movimientoInventario =
        await this.prisma.movimientoInventario.findMany({
          where: { idEmpresa: empresaId },
        });
      backupData.movimientosCartera =
        await this.prisma.movimientosCartera.findMany({ where: { empresaId } });
      backupData.detalleAjusteCartera =
        await this.prisma.detalleAjusteCartera.findMany({
          where: { movimiento: { empresaId } },
        });
      backupData.pagosProveedor = await this.prisma.pagoProveedor.findMany({
        where: { empresaId },
      });
      backupData.detallesPagoProveedor =
        await this.prisma.detallePagoProveedor.findMany({
          where: { pago: { empresaId } },
        });
      backupData.facturaCompra = await this.prisma.facturaCompra.findMany({
        where: { compra: { idEmpresa: empresaId } },
      });
      backupData.facturaProveedor = await this.prisma.facturaProveedor.findMany(
        { where: { empresaId } }
      );

      // ✅ 2. Guardar archivo JSON
      fs.writeFileSync(jsonPath, JSON.stringify(backupData, null, 2), 'utf-8');

      // ✅ 3. Generar archivo SQL con UPSERT
      const sqlScript = this.generarSQLConUpsert(backupData);
      fs.writeFileSync(sqlPath, sqlScript, 'utf-8');

      return { jsonPath, sqlPath, fileNameJson, fileNameSql };
    } catch (error) {
      throw new Error(`Error generando respaldo: ${(error as Error).message}`);
    }
  }

  /**
   * ✅ Genera el script SQL con INSERT ... ON CONFLICT (id) DO UPDATE
   */
  /**
   * ✅ Genera script SQL con UPSERT para evitar duplicados.
   * Si el registro existe → UPDATE, si no → INSERT.
   */
  private generarSQLConUpsert(data: BackupData): string {
    const lines: string[] = [];
    lines.push('-- Respaldo generado automáticamente con UPSERT\n');
    lines.push('BEGIN;');

    // ✅ Función genérica para generar los INSERT con ON CONFLICT
    const generarInsert = (
      table: string,
      rows: Array<Record<string, unknown>>,
      pk: string
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
            if (typeof val === 'number') return val;
            return `'${JSON.stringify(val).replace(/'/g, "''")}'`; // ✅ Manejo seguro
          })
          .join(', ');

        const updateSet = keys
          .filter((k) => k !== pk) // ✅ No actualiza la PK
          .map((k) => `"${k}" = EXCLUDED."${k}"`)
          .join(', ');

        lines.push(
          `INSERT INTO "${table}" (${keys
            .map((k) => `"${k}"`)
            .join(
              ', '
            )}) VALUES (${values}) ON CONFLICT ("${pk}") DO UPDATE SET ${updateSet};`
        );
      }
    };

    // ✅ Orden correcto para evitar errores de FK
    if (data.empresa) generarInsert('Empresa', [data.empresa], 'id');
    if (data.tipoMovimientos.length)
      generarInsert(
        'TipoMovimientos',
        data.tipoMovimientos,
        'idTipoMovimiento'
      );
    if (data.categoriasProducto.length)
      generarInsert(
        'CategoriasProducto',
        data.categoriasProducto,
        'idCategoria'
      );
    if (data.clientes.length) generarInsert('Cliente', data.clientes, 'id');
    if (data.usuarios.length) generarInsert('Usuario', data.usuarios, 'id');
    if (data.clienteEmpresa.length)
      generarInsert('ClienteEmpresa', data.clienteEmpresa, 'id');
    if (data.proveedores.length)
      generarInsert('Proveedores', data.proveedores, 'idProveedor');
    if (data.proveedorEmpresa.length)
      generarInsert(
        'ProveedorEmpresa',
        data.proveedorEmpresa,
        'idProveedorEmpresa'
      );
    if (data.productos.length) generarInsert('Producto', data.productos, 'id');
    if (data.inventario.length)
      generarInsert('Inventario', data.inventario, 'idInventario');
    if (data.compras.length) generarInsert('Compras', data.compras, 'idCompra');
    if (data.detalleCompra.length)
      generarInsert('DetalleCompra', data.detalleCompra, 'idDetalleCompra');
    if (data.pedidos.length) generarInsert('Pedido', data.pedidos, 'id');
    if (data.detallePedido.length)
      generarInsert('DetallePedido', data.detallePedido, 'id');
    if (data.estadoPedido.length)
      generarInsert('EstadoPedido', data.estadoPedido, 'id');
    if (data.recibos.length) generarInsert('Recibo', data.recibos, 'id');
    if (data.detalleRecibo.length)
      generarInsert('DetalleRecibo', data.detalleRecibo, 'idDetalleRecibo');
    if (data.movimientoInventario.length)
      generarInsert(
        'MovimientoInventario',
        data.movimientoInventario,
        'idMovimiento'
      );
    if (data.movimientosCartera.length)
      generarInsert(
        'MovimientosCartera',
        data.movimientosCartera,
        'idMovimientoCartera'
      );
    if (data.detalleAjusteCartera.length)
      generarInsert(
        'DetalleAjusteCartera',
        data.detalleAjusteCartera,
        'idDetalleAjuste'
      );
    // NUEVOS MÓDULOS — ORDEN CORRECTO

    if (data.facturaProveedor?.length) {
      // PK típica: idFacturaProveedor
      generarInsert(
        'FacturaProveedor',
        data.facturaProveedor,
        'idFacturaProveedor'
      );
    }

    if (data.facturaCompra?.length) {
      // Si tu modelo tiene PK simple (p. ej. "idFacturaCompra"), usa esa.
      // Si usas unique compuesto (facturaId + compraId), usa el compuesto:
      generarInsert('FacturaCompra', data.facturaCompra, 'idFacturaCompra');
      // generarInsert('FacturaCompra', data.facturaCompra, 'idFacturaCompra'); // <-- alternativa si aplica
    }

    if (data.pagosProveedor?.length) {
      // PK: idPagoProveedor (según tu modelo)
      generarInsert('PagoProveedor', data.pagosProveedor, 'idPagoProveedor');
    }

    if (data.detallesPagoProveedor?.length) {
      // Ajusta el nombre de la PK según tu esquema real (idDetallePagoProveedor o "id")
      generarInsert(
        'DetallePagoProveedor',
        data.detallesPagoProveedor,
        'idDetallePagoProveedor'
      );
      // generarInsert('DetallePagoProveedor', data.detallesPagoProveedor, 'id'); // alternativa si tu PK es "id"
    }

    lines.push('COMMIT;');
    return lines.join('\n');
  }
}
