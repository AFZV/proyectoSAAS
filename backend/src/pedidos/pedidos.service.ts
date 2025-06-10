import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
//import { UpdatePedidoDto } from './dto/update-pedido.dto';

@Injectable()
export class PedidosService {
  constructor(private prisma: PrismaService) {}

  ///crea un pedido en la bdd y sus relaciones
  async crearPedido(data: CreatePedidoDto, usuario: UsuarioPayload) {
    //  Validación: no permitir productos duplicados
    const ids = data.productos.map((p) => p.productoId);
    const set = new Set(ids);
    if (set.size !== ids.length) {
      throw new BadRequestException(
        'No se permiten productos duplicados en el pedido',
      );
    }
    //se calcula el total del pedido antes de crear el pedido
    const totalCalculado = data.productos.reduce((sum, p) => {
      return sum + p.cantidad * p.precio;
    }, 0);
    const { empresaId, id } = usuario;

    console.log('est es la empresa logueada :', empresaId);
    const pedido = await this.prisma.pedido.create({
      data: {
        ...data,
        empresaId: empresaId,
        usuarioId: id,
        estados: {
          create: {
            estado: 'GENERADO',
          },
        },

        productos: {
          create: data.productos.map((p) => ({
            productoId: p.productoId,
            cantidad: p.cantidad,
            precio: p.precio,
          })),
        },
        total: totalCalculado,
      },
      include: {
        productos: true,
      },
    });
    return pedido;
  }
  ///// cambia el estado del pedido y verifica si esta facturado lo descuenta del stock
  ///// se le debe enviar el id del pedido
  async agregarEstado(pedidoId: string, estado: string) {
    const estadoNormalizado = estado.toUpperCase();

    // 1. Verificar si ya tiene el estado
    const yaTieneEstado = await this.prisma.estadoPedido.findFirst({
      where: {
        pedidoId,
        estado: estadoNormalizado,
      },
    });

    if (yaTieneEstado) {
      throw new BadRequestException(
        `El pedido ya tiene el estado "${estadoNormalizado}"`,
      );
    }

    // 2. Registrar el nuevo estado
    const nuevoEstado = await this.prisma.estadoPedido.create({
      data: {
        pedidoId,
        estado: estadoNormalizado,
      },
    });

    // 3. Si es FACTURADO, realizar operaciones relacionadas
    if (estadoNormalizado === 'FACTURADO') {
      const pedido = await this.prisma.pedido.findUnique({
        where: { id: pedidoId },
        include: {
          productos: true,
        },
      });

      if (!pedido) {
        throw new BadRequestException('Pedido no encontrado');
      }

      // Validar stock de todos los productos
      for (const item of pedido.productos) {
        const inventario = await this.prisma.inventario.findFirst({
          where: {
            idProducto: item.productoId,
            idEmpresa: pedido.empresaId,
          },
        });

        if (!inventario) {
          throw new BadRequestException(
            `No hay inventario registrado para el producto con ID ${item.productoId}`,
          );
        }

        if (inventario.stockActual < item.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para el producto ${item.productoId}. Disponible: ${inventario.stockActual}, requerido: ${item.cantidad}`,
          );
        }
      }

      // Obtener ID del tipo de movimiento SALIDA
      const tipoSalida = await this.prisma.tipoMovimientos.findFirst({
        where: { tipo: 'SALIDA' },
      });

      if (!tipoSalida) {
        throw new BadRequestException(
          'No se encontró el tipo de movimiento "SALIDA"',
        );
      }

      // Construir arrays de actualizaciones y registros
      const updatesInventario = pedido.productos.map((item) =>
        this.prisma.inventario.updateMany({
          where: {
            idProducto: item.productoId,
            idEmpresa: pedido.empresaId,
          },
          data: {
            stockActual: {
              decrement: item.cantidad,
            },
          },
        }),
      );

      const movimientosInventario = pedido.productos.map((item) =>
        this.prisma.movimientoInventario.create({
          data: {
            idEmpresa: pedido.empresaId,
            idProducto: item.productoId,
            cantidadMovimiendo: item.cantidad,
            idTipoMovimiento: tipoSalida.idTipoMovimiento,
            IdUsuario: pedido.usuarioId,
            IdPedido: pedido.id,
          },
        }),
      );

      // Movimiento de cartera (aumenta deuda)
      const movimientoCartera = this.prisma.movimientosCartera.create({
        data: {
          idCliente: pedido.clienteId,
          idUsuario: pedido.usuarioId,
          empresaId: pedido.empresaId,
          valorMovimiento: pedido.total,
          idPedido: pedido.id,
        },
      });

      // Ejecutar todo en transacción
      await this.prisma.$transaction([
        ...updatesInventario,
        ...movimientosInventario,
        movimientoCartera,
      ]);
    }

    return nuevoEstado;
  }

  ///////////////////////////////
  async obtenerPedidos(usuario: UsuarioPayload) {
    if (!usuario) throw new BadRequestException('El usuario es requerido');
    const { empresaId, id: usuarioId, rol } = usuario;

    const pedidos = await this.prisma.pedido.findMany({
      where:
        rol === 'admin'
          ? {
              empresaId: empresaId,
            }
          : {
              empresaId,
              usuarioId,
            },
    });
    return pedidos;
  }
  ////////////////////////////////////////////////////////////////
  //actualizar un pedido con el update
  async actualizarPedido(
    pedidoId: string,
    data: UpdatePedidoDto,
    usuario: UsuarioPayload,
  ) {
    //busca el pedido que coincida con el id
    const pedidoExistente = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        productos: true,
        estados: {
          orderBy: { fechaEstado: 'desc' }, // Para tomar el último estado
          take: 1,
        },
      },
    });

    if (!pedidoExistente) {
      throw new BadRequestException('Pedido no encontrado');
    }
    //se captura el ultimo estado del pedido
    const ultimoEstado = pedidoExistente.estados[0]?.estado;

    const accionesReversibles: any[] = [];
    //se verifica si esta facturado ya que si lo esta deben revertirse las relaciones anteriores
    if (ultimoEstado === 'FACTURADO') {
      // Revertir movimientos de inventario
      for (const item of pedidoExistente.productos) {
        accionesReversibles.push(
          this.prisma.inventario.updateMany({
            where: {
              idProducto: item.productoId,
              idEmpresa: pedidoExistente.empresaId,
            },
            data: {
              stockActual: {
                increment: item.cantidad,
              },
            },
          }),
        );

        accionesReversibles.push(
          this.prisma.movimientoInventario.deleteMany({
            where: {
              IdPedido: pedidoExistente.id,
            },
          }),
        );
      }

      // Revertir movimiento de cartera
      accionesReversibles.push(
        this.prisma.movimientosCartera.deleteMany({
          where: {
            idPedido: pedidoExistente.id,
          },
        }),
      );

      await this.prisma.$transaction(accionesReversibles);
    }

    // Eliminar relaciones anteriores (detalle productos)
    await this.prisma.detallePedido.deleteMany({
      where: { pedidoId }, ///////asi deben quedar las eliminaciones de relaciones
    });

    // Actualizar el pedido principal con los nuevos productos si cambiaron o con los mismos sino
    const pedidoActualizado = await this.prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        ...data,
        productos: {
          create: data.productos?.map((item) => ({
            productoId: item.productoId,
            cantidad: item.cantidad,
            precio: item.precio,
          })),
        },
      },
      include: {
        productos: true,
      },
    });
    //se recalcula el nuevo total de pedido
    const totalCalculado = pedidoActualizado.productos.reduce((sum, p) => {
      return sum + p.cantidad * p.precio;
    }, 0);

    // despues de eliminadas las relaciones anteriores se crean las nuevas relaciones

    const tipoSalida = await this.prisma.tipoMovimientos.findFirst({
      where: { tipo: 'SALIDA' },
    });

    if (!tipoSalida) {
      throw new BadRequestException(
        'No se encontró el tipo de movimiento "SALIDA"',
      );
    }

    const actualizacionesStock = pedidoActualizado.productos.map((item) =>
      this.prisma.inventario.updateMany({
        where: {
          idProducto: item.productoId,
          idEmpresa: pedidoActualizado.empresaId,
        },
        data: {
          stockActual: {
            decrement: item.cantidad,
          },
        },
      }),
    );

    const movimientos = pedidoActualizado.productos.map((item) =>
      this.prisma.movimientoInventario.create({
        data: {
          idEmpresa: pedidoActualizado.empresaId,
          idProducto: item.productoId,
          cantidadMovimiendo: item.cantidad,
          idTipoMovimiento: tipoSalida.idTipoMovimiento,
          IdUsuario: usuario.id,
          IdPedido: pedidoActualizado.id,
        },
      }),
    );

    const movimientoCartera = this.prisma.movimientosCartera.create({
      data: {
        idCliente: pedidoActualizado.clienteId,
        idUsuario: usuario.id,
        empresaId: pedidoActualizado.empresaId,
        valorMovimiento: totalCalculado,
        idPedido: pedidoActualizado.id,
      },
    });

    await this.prisma.$transaction([
      ...actualizacionesStock,
      ...movimientos,
      movimientoCartera,
    ]);

    return pedidoActualizado;
  }
}
