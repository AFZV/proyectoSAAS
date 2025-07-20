import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';

@Injectable()
export class EstadisticasService {
  constructor(private prisma: PrismaService) {}

  async getStats(usuario: UsuarioPayload) {
    if (!usuario) throw new Error('Usuario no encontrado');

    const { empresaId, rol, id: usuarioId } = usuario;

    const ProductsLowStock = await this.prisma.$queryRaw`
  SELECT 
     p.id as id,
    p.nombre,
    p."imagenUrl",
    p."precioCompra",
    i."stockActual"
  FROM "Inventario" i
  JOIN "Producto" p ON p.id = i."idProducto"
  WHERE 
    i."idEmpresa" = ${empresaId}
    AND i."stockReferenciaOinicial" > 0
    AND i."stockActual" <= i."stockReferenciaOinicial" * 0.2
  ORDER BY i."stockActual" ASC
`;

    const productos = await this.prisma.$queryRaw`
  SELECT DISTINCT ON (p.id)
    p.id,
    p.nombre,
    p."imagenUrl",
    p."precioCompra",
    COALESCE(i."stockActual", 0) AS "stockActual"
  FROM "Producto" p
  LEFT JOIN "Inventario" i ON i."idProducto" = p.id AND i."idEmpresa" = ${empresaId}
  LEFT JOIN "DetallePedido" dp ON dp."productoId" = p.id
  LEFT JOIN "Pedido" pe ON pe.id = dp."pedidoId"
  WHERE 
    i."idEmpresa" = ${empresaId}
    AND (
      pe."fechaPedido" IS NULL OR pe."fechaPedido" < NOW() - INTERVAL '30 days'
    )
  ORDER BY p.id, "stockActual" ASC
`;

    const condicionUsuario =
      rol === 'admin' ? '' : `AND ce."usuarioId" = '${usuarioId}'`; // cuidado con SQL Injection, idealmente parametrizado

    const clientes = await this.prisma.$queryRawUnsafe(`
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
    LEFT JOIN "Pedido" ped ON ped."clienteId" = cli.id AND ped."empresaId" = '${empresaId}'
    WHERE ce."empresaId" = '${empresaId}'
    ${condicionUsuario}
    GROUP BY cli.id, usr.nombre
    HAVING MAX(ped."fechaPedido") IS NULL OR MAX(ped."fechaPedido") < NOW() - INTERVAL '90 days'
    ORDER BY cli.nombre ASC;
  `);

    return {
      ProductsLowStock,
      productos,
      clientes,
    };
  }

  //productos mas vendidos

  //cobros por vendedor por mes
}
