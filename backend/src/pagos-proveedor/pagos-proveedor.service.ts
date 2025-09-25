import { BadRequestException, Injectable } from '@nestjs/common';
import { CreatePagoProveedorDto } from './dto/create-pagos-proveedor.dto';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { PrismaService } from 'src/prisma/prisma.service';
//import { UpdatePagosProveedorDto } from './dto/update-pagos-proveedor.dto';

@Injectable()
export class PagosProveedorService {
  constructor(private prisma: PrismaService) {}
  async create(dto: CreatePagoProveedorDto, usuario: UsuarioPayload) {
    if (!usuario) throw new BadRequestException('usuario no autenticado');
    const { empresaId, id: usuarioId } = usuario;

    // Forzamos moneda default
    const moneda = dto.moneda || 'COP';

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear pago
      const pago = await tx.pagoProveedor.create({
        data: {
          empresaId,
          usuarioId,
          proveedorId: dto.proveedorId,
          fecha: dto.fecha ? new Date(dto.fecha) : undefined,
          moneda,
          tasaCambio: moneda === 'COP' ? undefined : dto.tasaCambio,
          metodoPago: dto.metodoPago,
          descripcion: dto.descripcion,
          comprobanteUrl: dto.comprobanteUrl,
          // calculamos totalPagado como suma de detalles
          totalPagado: dto.totalPagado ?? 0,
        },
      });

      let total = 0;

      // 2. Crear detalles y actualizar facturas
      for (const d of dto.detalles ?? []) {
        await tx.detallePagoProveedor.create({
          data: {
            pagoId: pago.idPagoProveedor,
            facturaId: d.facturaId,
            valor: d.valor,
            descuento: d.descuento ?? null,
          },
        });

        total += d.valor - (d.descuento ?? 0);

        // Restar saldo de la factura
        const factura = await tx.facturaProveedor.findUnique({
          where: { idFacturaProveedor: d.facturaId },
          select: { saldo: true, total: true },
        });

        if (factura) {
          const nuevoSaldo = Math.max(
            (factura.saldo ?? 0) - (d.valor - (d.descuento ?? 0)),
            0
          );

          await tx.facturaProveedor.update({
            where: { idFacturaProveedor: d.facturaId },
            data: {
              saldo: nuevoSaldo,
              estado:
                nuevoSaldo === 0
                  ? 'PAGADA'
                  : nuevoSaldo < factura.total
                    ? 'PARCIAL'
                    : 'ABIERTA',
            },
          });
        }
      }

      // 3. Actualizar totalPagado real
      const pagoFinal = await tx.pagoProveedor.update({
        where: { idPagoProveedor: pago.idPagoProveedor },
        data: { totalPagado: total },
        include: { detalles: true },
      });

      return pagoFinal;
    });
  }

  findAll() {
    return `This action returns all pagosProveedor`;
  }

  findOne(id: number) {
    return `This action returns a #${id} pagosProveedor`;
  }

  //update(id: number, updatePagosProveedorDto: UpdatePagosProveedorDto) {
  //   return `This action updates a #${id} pagosProveedor`;
  // }

  remove(id: number) {
    return `This action removes a #${id} pagosProveedor`;
  }
}
