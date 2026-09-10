import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { Prisma } from '@prisma/client';

/**
 * Umbrales de fecha ("hace N días") para las queries raw.
 *
 * En lugar de NOW() - INTERVAL 'N days' dentro de PostgreSQL (que depende del
 * timezone de la sesión de la DB), el umbral se calcula en Node como un
 * instante absoluto (new Date() - N días) y se pasa como parámetro Prisma.
 * Un instante absoluto es el mismo sin importar el timezone, por lo que
 * "hace 30 días" queda bien definido aunque el servidor esté en Alemania.
 *
 * Además, todas las queries ahora solo cuentan pedidos en estado FACTURADO
 * (unidos por EstadoPedido.fechaEstado), consistente con dashboard y reportes.
 */

@Injectable()
export class EstadisticasService {
  constructor(private prisma: PrismaService) { }

  async getStats(usuario: UsuarioPayload) {
    if (!usuario) throw new Error('Usuario no encontrado');

    const { empresaId, rol, id: usuarioId } = usuario;

    // 🔒 Normaliza rol y arma condición de stock si es vendedor
    const isVendedor = (rol || '').toLowerCase() === 'vendedor';
    const stockFilterForSeller = isVendedor
      ? Prisma.sql` AND COALESCE(i."stockActual", 0) > 0`
      : Prisma.sql``;

    // Umbral de fechas calculados en Node con timezone Bogotá (-05:00)
    // Evita dependencia del timezone del servidor PostgreSQL/Alemania
    const ahora = new Date();
    const hace30Dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
    const hace90Dias = new Date(ahora.getTime() - 90 * 24 * 60 * 60 * 1000);

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
          ${stockFilterForSeller}
        ORDER BY p."nombre" ASC, i."stockActual" ASC
      `
    );

    // 2) Productos sin ventas FACTURADAS en 30 días (o nunca)
    // Solo cuenta pedidos en estado FACTURADO para determinar si tiene ventas
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
      AND i."stockActual" > 0
      AND p.id NOT IN (
        SELECT DISTINCT dp."productoId"
        FROM "DetallePedido" dp
        INNER JOIN "Pedido" pe ON pe.id = dp."pedidoId"
        -- Solo pedidos FACTURADOS en los últimos 30 días
        INNER JOIN "EstadoPedido" ep
          ON ep."pedidoId" = pe.id
          AND ep.estado = 'FACTURADO'
          AND ep."fechaEstado" >= ${hace30Dias}
      )
      ${stockFilterForSeller}
    ORDER BY p.nombre ASC
  `
    );

    // 3) Clientes con última compra FACTURADA > 90 días (filtrando por usuario si no es admin)
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
          MAX(ep."fechaEstado") AS "ultimaCompra"
        FROM "Cliente" cli
        JOIN "ClienteEmpresa" ce ON ce."clienteId" = cli.id
        JOIN "Usuario" usr ON usr.id = ce."usuarioId"
        -- Unir con pedidos FACTURADOS (no cualquier pedido)
        LEFT JOIN "Pedido" ped 
          ON ped."clienteId" = cli.id 
         AND ped."empresaId" = ${empresaId}
        LEFT JOIN "EstadoPedido" ep
          ON ep."pedidoId" = ped.id
          AND ep.estado = 'FACTURADO'
        WHERE ce."empresaId" = ${empresaId}
        ${condicionUsuario}
        GROUP BY cli.id, usr.nombre
        HAVING MAX(ep."fechaEstado") IS NULL 
            OR MAX(ep."fechaEstado") < ${hace90Dias}
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

    // Umbral del periodo calculado en Node (Bogotá) para evitar NOW() del servidor
    const fechaInicioPeríodo = new Date(
      new Date().getTime() - periodo * 24 * 60 * 60 * 1000
    );

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
          COALESCE(SUM(
            CASE WHEN EXISTS (
              SELECT 1 FROM "EstadoPedido" ep
              WHERE ep."pedidoId" = ped.id
                AND ep.estado = 'FACTURADO'
                AND ep."fechaEstado" >= ${fechaInicioPeríodo}
            ) THEN dp.cantidad ELSE 0 END
          ), 0)::bigint                                        AS "unidadesVendidas",
          COALESCE(SUM(
            CASE WHEN EXISTS (
              SELECT 1 FROM "EstadoPedido" ep
              WHERE ep."pedidoId" = ped.id
                AND ep.estado = 'FACTURADO'
                AND ep."fechaEstado" >= ${fechaInicioPeríodo}
            ) THEN dp.cantidad ELSE 0 END
          )::float / ${periodo}, 0)                            AS "promedioDiario"
        FROM "Producto" p
        LEFT JOIN "Inventario" i
          ON i."idProducto" = p.id AND i."idEmpresa" = ${empresaId}
        LEFT JOIN "CategoriasProducto" cat
          ON cat."idCategoria" = p."categoriaId"
        -- Solo suma unidades de pedidos FACTURADOS en el periodo (ver CASE/EXISTS arriba)
        LEFT JOIN "DetallePedido" dp
          ON dp."productoId" = p.id
        LEFT JOIN "Pedido" ped
          ON ped.id = dp."pedidoId"
          AND ped."empresaId" = ${empresaId}
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
