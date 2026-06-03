import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { Prisma } from '@prisma/client';

@Injectable()
export class EstadisticasService {
  constructor(private prisma: PrismaService) {}

  async getStats(usuario: UsuarioPayload) {
    if (!usuario) throw new Error('Usuario no encontrado');

    const { empresaId, rol, id: usuarioId } = usuario;

    // 🔒 Normaliza rol y arma condición de stock si es vendedor
    const isVendedor = (rol || '').toLowerCase() === 'vendedor';
    const stockFilterForSeller = isVendedor
      ? Prisma.sql` AND COALESCE(i."stockActual", 0) > 0`
      : Prisma.sql``;

    // 1) Productos con bajo stock
    const ProductsLowStock = await this.prisma.$queryRaw(
      Prisma.sql`
        SELECT 
          p.id as id,
          p.nombre,
          p."imagenUrl",
          p."precioVenta",
          i."stockActual"
        FROM "Inventario" i
        JOIN "Producto" p ON p.id = i."idProducto"
        WHERE 
          i."idEmpresa" = ${empresaId}
          AND i."stockReferenciaOinicial" > 0
          AND i."stockActual" <= i."stockReferenciaOinicial" * 0.3
          AND p."estado"='activo'
          ${stockFilterForSeller}  -- 👈 si es vendedor, exige stock > 0
        ORDER BY p."nombre" ASC, i."stockActual" ASC
      `
    );

    // 2) Productos sin ventas en 30 días (o nunca)
    const productos = await this.prisma.$queryRaw(
      Prisma.sql`
    SELECT 
      p.id,
      p.nombre,
      p."imagenUrl",
      p."precioVenta",
      i."stockActual"
    FROM "Producto" p
    INNER JOIN "Inventario" i 
      ON i."idProducto" = p.id 
      AND i."idEmpresa" = ${empresaId}
    WHERE 
      p."estado" = 'activo'
      AND i."stockActual" > 0  -- Stock mayor a 0
      AND p.id NOT IN (
        SELECT DISTINCT dp."productoId"
        FROM "DetallePedido" dp
        INNER JOIN "Pedido" pe ON pe.id = dp."pedidoId"
        WHERE pe."fechaPedido" >= NOW() - INTERVAL '30 days'
      )
      ${stockFilterForSeller}
    ORDER BY p.nombre ASC
  `
    );
    // 3) Clientes con última compra > 90 días (filtrando por usuario si no es admin)
    const condicionUsuario =
      (rol || '').toLowerCase() === 'admin'
        ? Prisma.sql``
        : Prisma.sql`AND ce."usuarioId" = ${usuarioId}`;

    const clientes = await this.prisma.$queryRaw(
      Prisma.sql`
        SELECT 
          cli.id,
          cli.nit,
          cli.nombre,
          cli.apellidos,
          cli."rasonZocial",
          cli.telefono,
          cli.ciudad,
          cli.estado,
          usr.nombre AS "usuario",
          MAX(ped."fechaPedido") AS "ultimaCompra"
        FROM "Cliente" cli
        JOIN "ClienteEmpresa" ce ON ce."clienteId" = cli.id
        JOIN "Usuario" usr ON usr.id = ce."usuarioId"
        LEFT JOIN "Pedido" ped 
          ON ped."clienteId" = cli.id 
         AND ped."empresaId" = ${empresaId}
        WHERE ce."empresaId" = ${empresaId}
        ${condicionUsuario}
        GROUP BY cli.id, usr.nombre
        HAVING MAX(ped."fechaPedido") IS NULL 
            OR MAX(ped."fechaPedido") < NOW() - INTERVAL '90 days'
        ORDER BY cli.nombre ASC;
      `
    );

    return {
      ProductsLowStock,
      productos,
      clientes,
    };
  }

  async getRecomendacionCompra(
    usuario: UsuarioPayload,
    periodo: number,
    diasObjetivo: number
  ) {
    if (!usuario) throw new UnauthorizedException('Usuario no encontrado');
    if (usuario.rol !== 'admin')
      throw new UnauthorizedException('Solo el administrador puede ver este reporte');
    const { empresaId } = usuario;

    type RawRow = {
      id: string;
      codigo: bigint;
      nombre: string;
      categoria: string | null;
      precioCompra: number;
      unidadesPorBulto: bigint | null;
      stockActual: number;
      unidadesVendidas: bigint;
      promedioDiario: number;
    };

    const rows = await this.prisma.$queryRaw<RawRow[]>(
      Prisma.sql`
        SELECT
          p.id,
          p.codigo,
          p.nombre,
          cat.nombre                                           AS categoria,
          p."precioCompra",
          p."unidadesPorBulto",
          COALESCE(i."stockActual", 0)::float                  AS "stockActual",
          COALESCE(SUM(dp.cantidad), 0)::bigint                AS "unidadesVendidas",
          COALESCE(SUM(dp.cantidad)::float / ${periodo}, 0)    AS "promedioDiario"
        FROM "Producto" p
        LEFT JOIN "Inventario" i
          ON i."idProducto" = p.id AND i."idEmpresa" = ${empresaId}
        LEFT JOIN "CategoriasProducto" cat
          ON cat."idCategoria" = p."categoriaId"
        LEFT JOIN "DetallePedido" dp
          ON dp."productoId" = p.id
        LEFT JOIN "Pedido" ped
          ON ped.id = dp."pedidoId"
          AND ped."empresaId" = ${empresaId}
          AND ped."fechaPedido" >= NOW() - (${periodo} * INTERVAL '1 day')
        WHERE
          p."empresaId" = ${empresaId}
          AND p."estado" = 'activo'
        GROUP BY
          p.id, p.codigo, p.nombre, cat.nombre,
          p."precioCompra", p."unidadesPorBulto", i."stockActual"
      `
    );

    const semaforoOrder = { CRITICO: 0, REPONER: 1, OK: 2, SIN_VENTAS: 3 };

    return rows
      .map((r) => {
        const stock = Number(r.stockActual);
        const vendidas = Number(r.unidadesVendidas);
        const promedio = Number(r.promedioDiario);
        const upb = r.unidadesPorBulto ? Number(r.unidadesPorBulto) : null;
        const costo = Number(r.precioCompra);

        const diasStock =
          promedio > 0 ? Math.round(stock / promedio) : null;

        let semaforo: 'CRITICO' | 'REPONER' | 'OK' | 'SIN_VENTAS';
        if (vendidas === 0) {
          semaforo = 'SIN_VENTAS';
        } else if (stock <= 0 || diasStock === null || diasStock <= 15) {
          semaforo = 'CRITICO';
        } else if (diasStock <= 30) {
          semaforo = 'REPONER';
        } else {
          semaforo = 'OK';
        }

        const unidadesNecesarias = Math.ceil(promedio * diasObjetivo);
        const unidadesRecomendadas = Math.max(0, unidadesNecesarias - stock);
        const bultosRecomendados =
          upb && upb > 0 ? Math.ceil(unidadesRecomendadas / upb) : null;

        return {
          id: r.id,
          codigo: Number(r.codigo),
          nombre: r.nombre,
          categoria: r.categoria ?? null,
          precioCompra: costo,
          unidadesPorBulto: upb,
          stockActual: stock,
          unidadesVendidas: vendidas,
          promedioDiario: Number(promedio.toFixed(2)),
          diasStock,
          semaforo,
          unidadesRecomendadas,
          bultosRecomendados,
          inversionEstimada: Math.round(unidadesRecomendadas * costo),
        };
      })
      .sort((a, b) => {
        const diff = semaforoOrder[a.semaforo] - semaforoOrder[b.semaforo];
        if (diff !== 0) return diff;
        if (a.diasStock === null && b.diasStock === null) return 0;
        if (a.diasStock === null) return 1;
        if (b.diasStock === null) return -1;
        return a.diasStock - b.diasStock;
      });
  }
}
