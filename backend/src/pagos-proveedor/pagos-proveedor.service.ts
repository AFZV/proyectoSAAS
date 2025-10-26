import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePagoProveedorDto } from './dto/create-pagos-proveedor.dto';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { PrismaService } from 'src/prisma/prisma.service';
import { EstadoFacturaProvEnum } from '@prisma/client';
//import { UpdatePagosProveedorDto } from './dto/update-pagos-proveedor.dto';

@Injectable()
export class PagosProveedorService {
  constructor(private prisma: PrismaService) {}
  private calcularEstadoFactura(
    total: number,
    saldo: number
  ): EstadoFacturaProvEnum {
    if (saldo <= 0) return EstadoFacturaProvEnum.PAGADA;
    if (saldo >= total) return EstadoFacturaProvEnum.ABIERTA;
    return EstadoFacturaProvEnum.PARCIAL;
  }
  async deletePagoProveedor(idPagoProveedor: string, usuario: UsuarioPayload) {
    if (!usuario) {
      throw new BadRequestException('no autorizado');
    }
    const { empresaId } = usuario;
    // 1) Obtener pago y facturas afectadas (antes de borrar)

    ///obtener el detalle ya que el id que se enviaa es el del detalle

    const idPago = await this.prisma.detallePagoProveedor.findUnique({
      where: {
        idDetallePagoProveedor: idPagoProveedor,
      },
      select: {
        pagoId: true,
      },
    });
    if (!idPago) throw new Error('no existe el pago');
    const id = idPago.pagoId;
    const pago = await this.prisma.pagoProveedor.findUnique({
      where: { idPagoProveedor: id },
      select: { idPagoProveedor: true, empresaId: true },
    });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    if (empresaId && pago.empresaId !== empresaId) {
      throw new ForbiddenException('No tienes acceso a este recurso');
    }

    const detalles = await this.prisma.detallePagoProveedor.findMany({
      where: { pagoId: id },
      select: { facturaId: true },
    });
    const facturaIds = Array.from(new Set(detalles.map((d) => d.facturaId)));

    // 2) Transacción: borrar pago (cascade limpia detalles) + recomputar facturas
    await this.prisma.$transaction(async (tx) => {
      await tx.pagoProveedor.delete({ where: { idPagoProveedor: id } });

      for (const facturaId of facturaIds) {
        // Traer total y estado actual de la factura
        const factura = await tx.facturaProveedor.findUnique({
          where: { idFacturaProveedor: facturaId },
          select: { total: true, estado: true },
        });
        if (!factura) continue;

        // Sumar abonos remanentes (después de borrar el pago)
        const abonos = await tx.detallePagoProveedor.aggregate({
          where: { facturaId },
          _sum: { valor: true, descuento: true },
        });

        const totalAbonos =
          (abonos._sum.valor ?? 0) - (abonos._sum.descuento ?? 0);
        const nuevoSaldo = Math.max(factura.total - totalAbonos, 0);

        // Si la factura estaba ANULADA, preserva ese estado
        const nuevoEstado =
          factura.estado === EstadoFacturaProvEnum.ANULADA
            ? EstadoFacturaProvEnum.ANULADA
            : this.calcularEstadoFactura(factura.total, nuevoSaldo);

        await tx.facturaProveedor.update({
          where: { idFacturaProveedor: facturaId },
          data: { saldo: nuevoSaldo, estado: nuevoEstado },
        });
      }
    });

    return { ok: true };
  }
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
