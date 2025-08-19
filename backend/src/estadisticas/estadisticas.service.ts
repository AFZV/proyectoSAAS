import { Injectable } from '@nestjs/common';
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
          ${stockFilterForSeller}  -- 👈 si es vendedor, exige stock > 0
        ORDER BY p."nombre" ASC, i."stockActual" ASC
      `
    );

    // 2) Productos sin ventas en 30 días (o nunca)
    const productos = await this.prisma.$queryRaw(
      Prisma.sql`
        SELECT DISTINCT ON (p.id)
          p.id,
          p.nombre,
          p."imagenUrl",
          p."precioVenta",
          COALESCE(i."stockActual", 0) AS "stockActual"
        FROM "Producto" p
        LEFT JOIN "Inventario" i 
          ON i."idProducto" = p.id 
         AND i."idEmpresa" = ${empresaId}
        LEFT JOIN "DetallePedido" dp ON dp."productoId" = p.id
        LEFT JOIN "Pedido" pe ON pe.id = dp."pedidoId"
        WHERE 
          i."idEmpresa" = ${empresaId}
          AND (
            pe."fechaPedido" IS NULL 
            OR pe."fechaPedido" < NOW() - INTERVAL '30 days'
          )
          ${stockFilterForSeller}  -- 👈 si es vendedor, exige stock > 0
        ORDER BY p.id, "stockActual" ASC
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
}
