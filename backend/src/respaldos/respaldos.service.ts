import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import * as util from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execPromise = util.promisify(exec);

@Injectable()
export class RespaldosService {
  private dbUser = process.env.DB_USER || 'postgres';
  private dbPassword = process.env.DB_PASSWORD || '';
  private dbName = process.env.DB_NAME || 'mi_saas';
  private uploadDir = path.resolve('./uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /** ✅ Generar respaldo comprimido (.sql.gz) */
  async generarRespaldoPorEmpresa(empresaId: string) {
    if (!/^[a-f0-9-]{36}$/.test(empresaId)) {
      throw new Error('ID de empresa inválido');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `respaldo-${empresaId}-${timestamp}.sql.gz`;
    const filePath = path.join(this.uploadDir, fileName);

    const tablas = [
      'clientes',
      'clienteempresa',
      'proveedores',
      'proveedoresempresa',
      'categoriasproducto',
      'producto',
      'inventario',
      'compras',
      'detallecompra',
      'pedido',
      'detallepedido',
      'estadopedido',
      'recibo',
      'detallerecibo',
      'movimientoscartera',
      'detalleajustecartera',
      'movimientoinventario',
    ]
      .map((t) => `--table=${t}`)
      .join(' ');

    const dumpCmd = `
      PGPASSWORD=${this.dbPassword} \
      pg_dump -U ${this.dbUser} -d ${this.dbName} \
      --data-only --inserts --column-inserts \
      ${tablas} \
      --no-owner \
      --where="empresa_id='${empresaId}'" | gzip > ${filePath}
    `;

    try {
      await execPromise(dumpCmd);
      return { filePath, fileName };
    } catch (error) {
      throw new Error(`Error en pg_dump: ${(error as Error).message}`);
    }
  }

  /** ✅ Restaurar respaldo comprimido (.sql.gz) */
  async restaurarDesdeArchivo(filePath: string, empresaId: string) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Archivo no encontrado: ${filePath}`);
    }

    if (!/^[a-f0-9-]{36}$/.test(empresaId)) {
      throw new Error('ID de empresa inválido');
    }

    const deletes = `
      DELETE FROM detalleajustecartera WHERE idmovimiento IN (SELECT idmovimiento FROM movimientoscartera WHERE empresa_id='${empresaId}');
      DELETE FROM detallerecibo WHERE idrecibo IN (SELECT id FROM recibo WHERE empresa_id='${empresaId}');
      DELETE FROM detallepedido WHERE pedidoid IN (SELECT id FROM pedido WHERE empresa_id='${empresaId}');
      DELETE FROM estadopedido WHERE pedidoid IN (SELECT id FROM pedido WHERE empresa_id='${empresaId}');
      DELETE FROM pedido WHERE empresa_id='${empresaId}';
      DELETE FROM recibo WHERE empresa_id='${empresaId}';
      DELETE FROM movimientoscartera WHERE empresa_id='${empresaId}';
      DELETE FROM detallecompra WHERE idcompra IN (SELECT idcompra FROM compras WHERE idempresa='${empresaId}');
      DELETE FROM compras WHERE idempresa='${empresaId}';
      DELETE FROM inventario WHERE idempresa='${empresaId}';
      DELETE FROM producto WHERE empresa_id='${empresaId}';
      DELETE FROM categoriasproducto WHERE empresa_id='${empresaId}';
      DELETE FROM clienteempresa WHERE empresa_id='${empresaId}';
      DELETE FROM proveedoresempresa WHERE empresa_id='${empresaId}';
    `;

    const restoreCmd = `
      PGPASSWORD=${this.dbPassword} \
      psql -U ${this.dbUser} -d ${this.dbName} <<EOF
      BEGIN;
      ${deletes}
      \\! gunzip -c ${filePath} | psql -U ${this.dbUser} -d ${this.dbName}
      COMMIT;
EOF
    `;

    try {
      const { stdout, stderr } = await execPromise(restoreCmd);
      fs.unlinkSync(filePath);
      return { message: '✅ Restauración completada', logs: stdout || stderr };
    } catch (error) {
      throw new Error(
        `Error restaurando respaldo: ${(error as Error).message}`
      );
    }
  }
}
