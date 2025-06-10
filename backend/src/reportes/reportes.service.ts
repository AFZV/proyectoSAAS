import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { CrearReporteInvDto } from './dto/crear-reporte-inventario.dto';

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  //Reporte de compras por producto y total
  async inventarioValor(usuario: UsuarioPayload, data: CrearReporteInvDto) {
    //Parsear las fechas por si llegan en formato string
    const inicio = new Date(data.fechaInicio);
    const fin = new Date(data.fechaFin);

    //Buscar los productos de la empresa a la cual pertenece el usuario
    const productos = await this.prisma.producto.findMany({
      where: {
        empresaId: usuario.empresaId,
        //Filtramos por fechas de creacion del producto
        fechaCreado: {
          gte: inicio,
          lte: fin,
        },
      },
      include: {
        inventario: {
          select: { stockActual: true },
        },
      },
    });

    //Mapeamos los productos para incluir el stock y el valor total
    return productos.map((p) => {
      const stock = p.inventario.length > 0 ? p.inventario[0].stockActual : 0;
      const total = stock * p.precioCompra;
      return {
        nombre: p.nombre,
        cantidades: stock,
        precio: p.precioCompra,
        total,
      };
    });
  }
}
