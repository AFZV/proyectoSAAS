import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateClienteExcelDto } from './dto/create-masive-clientes.dto';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { CreateMasiveProductoDto } from './dto/create-masive-products.dto';
import { CreateMasiveInventariosDto } from './dto/create-masive-inventarios.dto';
import { formatearTexto } from 'src/lib/formatearTexto';
@Injectable()
export class ImportarService {
  constructor(private prisma: PrismaService) {}

  async cargarMasivaProductos(
    usuario: UsuarioPayload,
    data: CreateMasiveProductoDto[]
  ) {
    if (!data || !Array.isArray(data)) {
      throw new BadRequestException('Datos inválidos');
    }
    const { empresaId } = usuario;
    for (const product of data) {
      await this.prisma.producto.create({
        data: {
          nombre: formatearTexto(String(product.nombre)).trim(),
          precioCompra: product.precioCompra,
          precioVenta: product.precioVenta ?? 0,
          categoriaId: product.categoriaId,
          estado: 'activo',
          empresaId: empresaId,
        },
      });
    }
    return {
      mensaje: `✅ Se insertaron ${data.length} productos.`,
    };
  }
  async cargaMasivaInventario(
    usuario: UsuarioPayload,
    data: CreateMasiveInventariosDto[]
  ) {
    const { empresaId, id: usuarioId } = usuario;

    // Buscar ID del tipo de movimiento 'AJUSTE' solo una vez
    const tipoAjuste = await this.prisma.tipoMovimientos.findFirst({
      where: {
        tipo: 'AJUSTE',
      },
    });

    if (!tipoAjuste) {
      throw new Error(
        'Tipo de movimiento AJUSTE no está definido en la base de datos.'
      );
    }

    for (const item of data) {
      // Validación de entrada
      if (!item.idProducto || isNaN(Number(item.stock))) {
        console.warn(`⚠️ Fila inválida:`, item);
        continue;
      }

      const producto = await this.prisma.producto.findFirst({
        where: {
          id: item.idProducto,
          empresaId,
        },
      });

      if (!producto) {
        console.warn(
          `⚠️ Producto inválido o no pertenece a la empresa: ${item.idProducto}`
        );
        continue;
      }

      const inventario = await this.prisma.inventario.findFirst({
        where: {
          idProducto: item.idProducto,
          idEmpresa: empresaId,
        },
      });

      const stockNuevo = Number(item.stock);

      if (inventario) {
        // Solo actualizar stockActual (nunca el stockReferenciaOinicial)
        await this.prisma.inventario.update({
          where: {
            idInventario: inventario.idInventario,
          },
          data: {
            stockActual: { increment: stockNuevo },
          },
        });

        // Registrar movimiento solo si hay diferencia

        await this.prisma.movimientoInventario.create({
          data: {
            idEmpresa: empresaId,
            idProducto: item.idProducto,
            cantidadMovimiendo: stockNuevo,
            idTipoMovimiento: tipoAjuste.idTipoMovimiento,
            IdUsuario: usuarioId,
            observacion: 'Ajuste por actualización masiva de stock',
          },
        });
      } else {
        // Primera carga de inventario para ese producto
        await this.prisma.inventario.create({
          data: {
            idProducto: item.idProducto,
            idEmpresa: empresaId,
            stockActual: stockNuevo,
            stockReferenciaOinicial: stockNuevo,
          },
        });

        // Registrar movimiento inicial
        await this.prisma.movimientoInventario.create({
          data: {
            idEmpresa: empresaId,
            idProducto: item.idProducto,
            cantidadMovimiendo: stockNuevo,
            idTipoMovimiento: tipoAjuste.idTipoMovimiento,
            IdUsuario: usuarioId,
            observacion: 'Ajuste inicial por primera carga de inventario',
          },
        });
      }
    }

    return {
      mensaje: `✅ Se procesaron ${data.length} registros de inventario correctamente.`,
    };
  }

  async cargarMasivamenteClientes(
    usuario: UsuarioPayload,
    data: CreateClienteExcelDto[]
  ) {
    if (!data || !Array.isArray(data)) {
      throw new BadRequestException('Datos inválidos');
    }
    const { empresaId, id } = usuario;

    for (const cliente of data) {
      const createdCliente = await this.prisma.cliente.create({
        data: {
          nit: formatearTexto(String(cliente.nit)).trim(),
          rasonZocial: formatearTexto(cliente.rasonZocial).trim(),
          nombre: formatearTexto(cliente.nombre).trim(),
          apellidos: formatearTexto(cliente.apellidos).trim(),
          telefono: formatearTexto(String(cliente.telefono)).trim(),
          email: cliente.email.trim(),
          direccion: formatearTexto(cliente.direccion).trim(),
          departamento: formatearTexto(cliente.departamento).trim(),
          ciudad: formatearTexto(cliente.ciudad).trim(),
          estado:
            String(cliente.estado).toLowerCase() === 'true' ||
            String(cliente.estado) === '1',
        },
      });

      await this.prisma.clienteEmpresa.create({
        data: {
          clienteId: createdCliente.id,
          empresaId,
          usuarioId: cliente.vendedor || id,
        },
      });
    }

    return {
      mensaje: `✅ Se insertaron ${data.length} clientes.`,
    };
  }
}
