import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateFacturasProveedorDto } from './dto/create-facturas-proveedor.dto';
//import { UpdateFacturasProveedorDto } from './dto/update-facturas-proveedor.dto';
import { PrismaService } from 'src/prisma/prisma.service';
//import { UsuarioPayload } from 'src/types/usuario-payload';

@Injectable()
export class FacturasProveedorService {
  constructor(private prisma: PrismaService) {}
  private parseISODate(d?: string): Date | null {
    if (!d) return null;
    // Acepta 'YYYY-MM-DD' y lo convierte a ISO completo a medianoche local (o UTC si prefieres).
    // Para evitar problemas de zona, puedes forzar 'T00:00:00.000Z' o construir con Date.UTC.
    const full = d.length === 10 ? `${d}T00:00:00.000Z` : d;
    const dt = new Date(full);
    if (isNaN(dt.getTime())) throw new BadRequestException('Fecha inválida');
    return dt;
  }

  async create(dto: CreateFacturasProveedorDto, empresaId: string) {
    const fechaEmision = this.parseISODate(dto.fechaEmision) ?? new Date();
    const fechaVencimiento = this.parseISODate(dto.fechaVencimiento) ?? null;

    // Si moneda != COP, exige tasaCambio
    if (
      (dto.moneda ?? 'COP') !== 'COP' &&
      (!dto.tasaCambio || dto.tasaCambio <= 0)
    ) {
      throw new BadRequestException(
        'tasaCambio es obligatoria cuando moneda != COP'
      );
    }

    const newFactura = await this.prisma.facturaProveedor.create({
      data: {
        empresaId,
        proveedorId: dto.proveedorId,
        numero: dto.numero,
        fechaEmision,
        fechaVencimiento,
        moneda: dto.moneda ?? 'COP',
        tasaCambio: dto.tasaCambio ?? null,
        total: dto.total,
        saldo: dto.total, // invariante
        notas: dto.notas ?? null,
        soporteUrl: dto.soporteUrl ?? null,
        estado: dto.estado ?? 'ABIERTA',
      },
    });

    // Si vino compraId, enlaza en FacturaCompra (tabla puente)
    if (dto.compraId) {
      await this.prisma.facturaCompra.create({
        data: {
          facturaId: newFactura.idFacturaProveedor,
          compraId: dto.compraId,
        },
      });
    }

    return newFactura;
  }

  findAll() {
    return `This action returns all facturasProveedor`;
  }

  findOne(id: number) {
    return `This action returns a #${id} facturasProveedor`;
  }

  // update(id: number, updateFacturasProveedorDto: UpdateFacturasProveedorDto) {
  //   return `This action updates a #${id} facturasProveedor`;
  // }

  remove(id: number) {
    return `This action removes a #${id} facturasProveedor`;
  }
}
