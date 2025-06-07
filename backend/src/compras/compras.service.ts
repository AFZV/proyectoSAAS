import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { UsuarioPayload } from 'src/types/usuario-payload';

@Injectable()
export class ComprasService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crea una compra + su detalle + actualiza/inicializa Inventario.
   */
  async create(usuario: UsuarioPayload, data: CreateCompraDto) {
    // Abrimos una transacción para que todo se ejecute de forma atómica
    try {
      return await this.prisma.$transaction(async (tx) => {
        //1 Creamos la cabecera de la compra
        const nuevaCompra = await tx.compras.create({
          data: {
            proveedor: { connect: { idProveedor: data.idProveedor } },
            empresa: { connect: { id: data.idEmpresa } },
          },
        });
        //crear el detalle para cada producto en  la compra
        for (const item of data.ProductosCompras) {
          await tx.detalleCompra.create({
            data: {
              idCompra: nuevaCompra.idCompra,
              idProducto: item.idProducto,
              cantidad: item.cantidad,
            },
          });

          //3Actualizar o crear el inventario del producto
          const inv = await tx.inventario.findFirst({
            where: {
              idProducto: item.idProducto,
              idEmpresa: data.idEmpresa,
            },
          });

          if (inv) {
            //Si ya existe el inventario, sumamos la cantidad
            await tx.inventario.update({
              where: { idInventario: inv.idInventario },
              data: {
                stockReferenciaOinicial: inv.stockActual + item.cantidad,
                stockActual: inv.stockActual + item.cantidad,
              },
            });
          } else {
            //Si no existe, creamos el registro de inventario
            await tx.inventario.create({
              data: {
                idProducto: item.idProducto,
                idEmpresa: data.idEmpresa,
                stockReferenciaOinicial: item.cantidad,
                stockActual: item.cantidad,
              },
            });
          }
        }
        //Retornamos la compra creada
        return nuevaCompra;
      });
    } catch (error: any) {
      console.error('Error en transacción de compra:', error);
      throw new Error('Error al crear la compra');
    }
  }
}
