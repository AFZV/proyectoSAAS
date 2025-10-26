import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateFacturasProveedorDto } from './dto/create-facturas-proveedor.dto';
import { UpdateFacturasProveedorDto } from './dto/update-facturas-proveedor.dto';
import { PrismaService } from 'src/prisma/prisma.service';

import { UsuarioPayload } from 'src/types/usuario-payload';
type MovimientoProveedor = {
  id: string;
  fecha: string; // "YYYY-MM-DD"
  tipo: 'Factura' | 'Pago' | 'Nota crédito' | 'Ajuste';
  numero: string;
  monto: number; // + para facturas/ajustes de débito, - para pagos/notas crédito
  saldo: number; // saldo acumulado después del movimiento
  descripcion?: string; // Descripción del pago, si aplica
  vencimiento?: Date | string; // Fecha de vencimiento, si aplica
};
function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function inicioDeHoyBogota() {
  const now = new Date();
  return new Date(`${ymd(now)}T00:00:00.000-05:00`);
}
function finEnNDiasBogota(n: number) {
  const end = new Date();
  end.setDate(end.getDate() + n);
  return new Date(`${ymd(end)}T23:59:59.999-05:00`);
}

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

  async findAll(usuario: UsuarioPayload) {
    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }
    const { empresaId } = usuario;

    const facturas = await this.prisma.facturaProveedor.findMany({
      where: { empresaId: empresaId },
      include: { compras: true, proveedor: true, pagos: true },
    });
    if (!facturas) {
      throw new BadRequestException('No hay facturas para esta empresa');
    }
    return facturas;
  }
  findOne(id: string, usuario: UsuarioPayload) {
    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }
    const { empresaId } = usuario;

    return this.prisma.facturaProveedor.findFirst({
      where: { idFacturaProveedor: id, empresaId: empresaId },
      include: { compras: true, proveedor: true, pagos: true },
    });
  }

  async findByProveedor(
    proveedorId: string,
    usuario: UsuarioPayload
  ): Promise<MovimientoProveedor[]> {
    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }
    const { empresaId } = usuario;

    const facturas = await this.prisma.facturaProveedor.findMany({
      where: { empresaId, proveedorId },
      orderBy: { fechaEmision: 'asc' },
      include: {
        proveedor: true,
        compras: true,
        pagos: {
          include: {
            // Para obtener la fecha del pago
            pago: true, // <-- PagoProveedor
          },
        },
      },
    });

    if (!facturas || facturas.length === 0) {
      throw new NotFoundException('No hay facturas para este proveedor');
    }

    // Construimos una línea por cada FACTURA y por cada PAGO de esa factura
    const eventos: Array<{
      id: string;
      fecha: Date;
      tipo: 'Factura' | 'Pago';
      numero: string;
      monto: number;
      descripcion?: string | null;
      vencimiento?: Date | null; // <-- NUEVO
    }> = [];

    function formatYMDLocal(date: Date) {
      // evita el corrimiento de UTC
      const off = date.getTimezoneOffset();
      const local = new Date(date.getTime() - off * 60_000);
      return local.toISOString().slice(0, 10);
    }
    for (const f of facturas) {
      // 1) Evento FACTURA (monto positivo)
      eventos.push({
        id: f.idFacturaProveedor,
        fecha: new Date(f.fechaEmision),
        tipo: 'Factura',
        numero: f.numero,
        monto: Number(f.total ?? 0),
        descripcion: f.notas,
        vencimiento: f.fechaVencimiento ?? null, // <-- LEE DE LA BDD
      });

      // 2) Eventos PAGO (monto negativo)
      //    Usamos el neto del detalle: valor - descuento (si aplica)
      const detalles = (f.pagos ?? []).map((d) => {
        const neto = Number(d.valor ?? 0) - Number(d.descuento ?? 0);
        return {
          id: d.idDetallePagoProveedor,
          fecha: new Date(d.pago?.fecha ?? f.fechaEmision), // fallback seguro
          tipo: 'Pago' as const,
          numero: `PAGO-${(d.pagoId || '').slice(0, 5)} / ${f.numero}`,
          monto: -neto, // pagos restan
          descripcion: d.pago?.descripcion || null,
        };
      });

      // Ordena pagos por fecha por si vienen desordenados
      detalles.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
      eventos.push(...detalles);
    }

    // Mezclamos todo y ordenamos globalmente por fecha, y en empate: Factura antes que Pago
    eventos.sort((a, b) => {
      const df = a.fecha.getTime() - b.fecha.getTime();
      if (df !== 0) return df;
      // Prioriza "Factura" sobre "Pago" en la misma fecha
      if (a.tipo === b.tipo) return 0;
      return a.tipo === 'Factura' ? -1 : 1;
    });

    // Calculamos el saldo acumulado
    let saldo = 0;
    const movimientos: MovimientoProveedor[] = eventos.map((e) => {
      saldo += e.monto;
      return {
        id: e.id,
        fecha: e.fecha.toISOString().slice(0, 10),
        tipo: e.tipo,
        numero: e.numero,
        monto: Math.round(e.monto), // o deja número tal cual si manejas decimales
        saldo: Math.round(saldo), // idem: ajusta a tus necesidades (Float con 2 decimales?)
        descripcion: e.descripcion || undefined,
        vencimiento:
          e.tipo === 'Factura' && e.vencimiento
            ? formatYMDLocal(e.vencimiento)
            : undefined,
      };
    });

    return movimientos;
  }
  async update(
    id: string,
    updateFacturasProveedorDto: UpdateFacturasProveedorDto,
    usuario: UsuarioPayload
  ) {
    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }
    const { empresaId } = usuario;
    const factura = await this.prisma.facturaProveedor.findUnique({
      where: { idFacturaProveedor: id, empresaId: empresaId },
      include: { pagos: true, compras: true, proveedor: true },
    });
    if (!factura) {
      throw new BadRequestException('Factura no encontrada');
    }
    const updateFacturaproveedor = await this.prisma.facturaProveedor.update({
      where: { idFacturaProveedor: id },
      data: { ...updateFacturasProveedorDto },
    });
    return updateFacturaproveedor;
  }

  // interface FacturaPendienteItem {
  //   idFacturaProveedor: string;
  //   numero: string;
  //   saldo: number; // saldo en la moneda de la factura
  //   moneda: MonedaISO;
  //   tasaCambio?: number | null; // si aplica
  //   fechaEmision?: string;
  //   fechaVencimiento?: string | null;
  // }

  async findFacturasByProveedorSaldo(
    proveedorId: string,
    usuario: UsuarioPayload
  ) {
    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }
    const { empresaId } = usuario;
    const facturas = await this.prisma.facturaProveedor.findMany({
      where: {
        empresaId: empresaId,
        proveedorId: proveedorId,
        saldo: { gt: 0 },
      },
      select: {
        idFacturaProveedor: true,
        numero: true,
        saldo: true,
        moneda: true,
        tasaCambio: true,
        fechaEmision: true,
        fechaVencimiento: true,
      },
    });
    if (!facturas) {
      throw new Error('no hay facturas');
    }
    return facturas;
  }
  async getSaldosPorProveedor(usuario: UsuarioPayload) {
    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }
    const { empresaId } = usuario;

    // 1) Agrupar facturas abiertas por proveedor y tomar saldo + moneda
    const grouped = await this.prisma.facturaProveedor.groupBy({
      by: ['proveedorId'],
      where: {
        empresaId,
        saldo: { gt: 0 },
        // estado: { not: 'ANULADA' },
      },
      _sum: { saldo: true },
      _min: { moneda: true }, // 👈 como sólo hay una moneda, da igual min o max
    });

    if (grouped.length === 0) return [];

    // 2) Traer datos de proveedores
    const proveedorIds = grouped.map((g) => g.proveedorId);
    const proveedores = await this.prisma.proveedores.findMany({
      where: { idProveedor: { in: proveedorIds } },
      select: {
        idProveedor: true,
        razonsocial: true,
        identificacion: true,
        direccion: true,
        telefono: true,
      },
    });

    // 3) Merge proveedor + saldo + moneda
    const resultado = proveedores
      .map((p) => {
        const g = grouped.find((x) => x.proveedorId === p.idProveedor);
        return {
          ...p,
          saldoPendiente: Number(g?._sum.saldo ?? 0),
          moneda: g?._min.moneda ?? 'COP', // 👈 única moneda del proveedor
        };
      })
      .sort((a, b) => b.saldoPendiente - a.saldoPendiente);

    return resultado;
  }

  async getHistorialPagos(idProveedor: string, usuario: UsuarioPayload) {
    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }
    const { empresaId } = usuario;
    const factura = await this.prisma.facturaProveedor.findFirst({
      where: { idFacturaProveedor: idProveedor, empresaId: empresaId },
      include: { pagos: true, compras: true, proveedor: true },
    });
    if (!factura) {
      throw new BadRequestException('Factura no encontrada');
    }
    return factura.pagos;
  }
  //  {
  //       id: "1",
  //       fecha: "2024-01-15",
  //       tipo: "Factura",
  //       numero: "F001-000123",
  //       monto: 500000,
  //       saldo: 500000,
  //     },

  async getResumen(usuario: UsuarioPayload) {
    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }
    const { empresaId } = usuario;

    // Total facturas emitidas
    const totalFacturasYuan = await this.prisma.facturaProveedor.aggregate({
      where: { empresaId, saldo: { gt: 0 }, moneda: 'CNY' },
      _sum: { saldo: true },
    });
    const totalFacturasUsd = await this.prisma.facturaProveedor.aggregate({
      where: { empresaId, saldo: { gt: 0 }, moneda: 'USD' },
      _sum: { saldo: true },
    });
    const totalFacturasCop = await this.prisma.facturaProveedor.aggregate({
      where: { empresaId, saldo: { gt: 0 }, moneda: 'COP' },
      _sum: { saldo: true },
    });
    const desde = inicioDeHoyBogota(); // inicio del día (incluye “hoy”)
    const hasta = finEnNDiasBogota(30); // próximos 30 días

    const vencimientosProximos = await this.prisma.facturaProveedor.count({
      where: {
        empresaId,
        saldo: { gt: 0 },
        OR: [
          { fechaVencimiento: { lt: desde } }, // VENCIDAS
          { fechaVencimiento: { gte: desde, lte: hasta } }, // POR VENCER (incluye hoy)
        ],

        // estado: { not: 'ANULADA' }, // opcional
      },
    });

    const totalDeudaUsd = Number(totalFacturasUsd._sum.saldo ?? 0);
    const totalDeudaCop = Number(totalFacturasCop._sum.saldo ?? 0);
    const totalDeudaYuan = Number(totalFacturasYuan._sum.saldo ?? 0);
    return {
      totalPorPagar: {
        deudaUsd: totalDeudaUsd,
        deudaCop: totalDeudaCop,
        deudaYuan: totalDeudaYuan,
      },
      vencimientosProximos,
    };
  }

  async getVencimientos(usuario: UsuarioPayload) {
    if (!usuario) throw new BadRequestException('Usuario no autenticado');
    const { empresaId } = usuario;

    const desde = inicioDeHoyBogota(); // inicio del día (incluye “hoy”)
    const hasta = finEnNDiasBogota(30); // próximos 30 días

    const facturas = await this.prisma.facturaProveedor.findMany({
      where: {
        empresaId,
        saldo: { gt: 0 },
        OR: [
          { fechaVencimiento: { lt: desde } }, // VENCIDAS
          { fechaVencimiento: { gte: desde, lte: hasta } }, // POR VENCER (incluye hoy)
        ],
        // estado: { not: 'ANULADA' },
      },
      orderBy: { fechaVencimiento: 'asc' },
      include: { proveedor: true },
    });

    return facturas;
  }

  async remove(idFacturaProveedor: string, usuario: UsuarioPayload) {
    // 1) verificar existencia
    if (!usuario) {
      throw new BadRequestException('usuario noa utenticado aun');
    }
    const { empresaId } = usuario;
    const factura = await this.prisma.facturaProveedor.findUnique({
      where: { idFacturaProveedor, empresaId },
      select: { idFacturaProveedor: true },
    });
    if (!factura) throw new NotFoundException('Factura no encontrada');

    // 2) verificar que no tenga abonos
    const tieneAbonos = await this.prisma.detallePagoProveedor.findFirst({
      where: { facturaId: idFacturaProveedor },
      select: { idDetallePagoProveedor: true },
    });
    if (tieneAbonos) {
      throw new BadRequestException(
        'No se puede eliminar: la factura tiene abonos.'
      );
    }

    // 3) eliminar: cascada limpiará FacturaCompra (si definiste CASCADE allí)
    await this.prisma.facturaProveedor.delete({
      where: { idFacturaProveedor, empresaId },
    });

    return { ok: true };
  }
}
