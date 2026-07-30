import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { CreateOrdenCompraDto } from './dto/create-orden-compra.dto';
import { UpdateOrdenCompraDto } from './dto/update-orden-compra.dto';
import * as ExcelJS from 'exceljs';

@Injectable()
export class OrdenesCompraService {
  constructor(private prisma: PrismaService) {}

  async crear(data: CreateOrdenCompraDto, usuario: UsuarioPayload) {
    const { empresaId } = usuario;

    // Validar que el proveedor pertenece a la empresa
    const proveedorEmpresa = await this.prisma.proveedorEmpresa.findFirst({
      where: { proveedorId: data.proveedorId, empresaId },
    });
    if (!proveedorEmpresa) throw new BadRequestException('Proveedor no encontrado en esta empresa');

    // Obtener todos los productos para calcular bultos/peso/cubicaje
    const productosIds = data.detalles.map((d) => d.productoId);
    const productos = await this.prisma.producto.findMany({
      where: { id: { in: productosIds }, empresaId },
    });
    const productosMap = new Map(productos.map((p) => [p.id, p]));

    return this.prisma.$transaction(async (tx) => {
      const orden = await tx.ordenCompra.create({
        data: {
          empresaId,
          proveedorId: data.proveedorId,
          observaciones: data.observaciones,
          detalles: {
            create: data.detalles.map((detalle) => {
              const producto = productosMap.get(detalle.productoId);
              if (!producto) throw new BadRequestException(`Producto ${detalle.productoId} no encontrado`);

              const upb = producto.unidadesPorBulto ?? 1;
              const bultos = detalle.cantidad / upb;
              const pesoTotal = bultos * (producto.pesoPorBulto ?? 0);
              const cubicaje = bultos * (producto.cubicajePorBulto ?? 0);

              return {
                productoId: detalle.productoId,
                cantidad: detalle.cantidad,
                precioUnitario: detalle.precioUnitario,
                moneda: detalle.moneda,
                bultos,
                pesoTotal,
                cubicaje,
              };
            }),
          },
        },
        include: {
          proveedor: true,
          detalles: { include: { producto: true } },
        },
      });

      return orden;
    });
  }

  async listar(usuario: UsuarioPayload) {
    const { empresaId } = usuario;

    const ordenes = await this.prisma.ordenCompra.findMany({
      where: { empresaId },
      include: {
        proveedor: { select: { razonsocial: true, identificacion: true } },
        detalles: { select: { id: true } },
      },
      orderBy: { fechaCreacion: 'desc' },
    });

    return ordenes.map((o) => ({
      ...o,
      totalProductos: o.detalles.length,
      detalles: undefined,
    }));
  }

  async detalle(id: string, usuario: UsuarioPayload) {
    const orden = await this.prisma.ordenCompra.findUnique({
      where: { id },
      include: {
        proveedor: true,
        empresa: { select: { nombreComercial: true, nit: true } },
        detalles: {
          include: {
            producto: {
              select: {
                nombre: true,
                referencia: true,
                imagenUrl: true,
                unidadesPorBulto: true,
              },
            },
          },
        },
      },
    });

    if (!orden) throw new NotFoundException('Orden de compra no encontrada');
    if (orden.empresaId !== usuario.empresaId)
      throw new ForbiddenException('No autorizado');

    return orden;
  }

  async actualizar(id: string, data: UpdateOrdenCompraDto, usuario: UsuarioPayload) {
    const orden = await this.prisma.ordenCompra.findUnique({ where: { id } });
    if (!orden) throw new NotFoundException('Orden de compra no encontrada');
    if (orden.empresaId !== usuario.empresaId) throw new ForbiddenException('No autorizado');

    return this.prisma.ordenCompra.update({
      where: { id },
      data,
    });
  }

  async eliminar(id: string, usuario: UsuarioPayload) {
    const orden = await this.prisma.ordenCompra.findUnique({ where: { id } });
    if (!orden) throw new NotFoundException('Orden de compra no encontrada');
    if (orden.empresaId !== usuario.empresaId) throw new ForbiddenException('No autorizado');
    if (orden.estado !== 'BORRADOR')
      throw new BadRequestException('Solo se pueden eliminar órdenes en estado BORRADOR');

    await this.prisma.ordenCompra.delete({ where: { id } });
    return { message: 'Orden eliminada correctamente' };
  }

  async generarExcel(id: string, usuario: UsuarioPayload): Promise<Buffer> {
    const orden = await this.prisma.ordenCompra.findUnique({
      where: { id },
      include: {
        proveedor: true,
        empresa: { select: { nombreComercial: true, nit: true } },
        detalles: {
          include: {
            producto: {
              select: { nombre: true, referencia: true },
            },
          },
        },
      },
    });

    if (!orden) throw new NotFoundException('Orden de compra no encontrada');
    if (orden.empresaId !== usuario.empresaId) throw new ForbiddenException('No autorizado');

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Orden de Compra');

    // ── Cabecera ──────────────────────────────────────────────────
    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } },
    };

    ws.mergeCells('A1:I1');
    ws.getCell('A1').value = orden.empresa.nombreComercial.toUpperCase();
    ws.getCell('A1').font = { bold: true, size: 14 };
    ws.getCell('A1').alignment = { horizontal: 'center' };

    ws.getCell('A2').value = 'Proveedor:';
    ws.getCell('B2').value = orden.proveedor.razonsocial;
    ws.getCell('A3').value = 'NIT Proveedor:';
    ws.getCell('B3').value = orden.proveedor.identificacion;
    ws.getCell('A4').value = 'Teléfono:';
    ws.getCell('B4').value = orden.proveedor.telefono;
    ws.getCell('A5').value = 'Fecha:';
    ws.getCell('B5').value = orden.fechaCreacion.toLocaleDateString('es-CO');
    ws.getCell('A6').value = 'OC Ref:';
    ws.getCell('B6').value = id.slice(0, 8).toUpperCase();

    ws.addRow([]);

    // ── Encabezados de columnas ───────────────────────────────────
    const colHeaders = [
      'Referencia', 'Descripción', 'Cantidad', 'Bultos',
      'Precio Unit.', 'Moneda', 'Subtotal', 'Peso Total (kg)', 'Cubicaje (m³)',
    ];
    const headerRow = ws.addRow(colHeaders);
    headerRow.eachCell((cell) => Object.assign(cell, headerStyle));

    ws.columns = [
      { key: 'ref',      width: 16 },
      { key: 'nombre',   width: 30 },
      { key: 'cantidad', width: 12 },
      { key: 'bultos',   width: 10 },
      { key: 'precio',   width: 14 },
      { key: 'moneda',   width: 10 },
      { key: 'subtotal', width: 16 },
      { key: 'peso',     width: 16 },
      { key: 'cubicaje', width: 16 },
    ];

    // ── Filas de detalle ──────────────────────────────────────────
    let totalBultos = 0;
    let totalPeso = 0;
    let totalCubicaje = 0;
    const subtotalesPorMoneda: Record<string, number> = {};

    for (const d of orden.detalles) {
      const subtotal = d.cantidad * d.precioUnitario;
      subtotalesPorMoneda[d.moneda] = (subtotalesPorMoneda[d.moneda] ?? 0) + subtotal;
      totalBultos += d.bultos;
      totalPeso += d.pesoTotal;
      totalCubicaje += d.cubicaje;

      ws.addRow([
        d.producto.referencia ?? '',
        d.producto.nombre,
        d.cantidad,
        +d.bultos.toFixed(4),
        d.precioUnitario,
        d.moneda,
        +subtotal.toFixed(2),
        +d.pesoTotal.toFixed(3),
        +d.cubicaje.toFixed(4),
      ]);
    }

    ws.addRow([]);

    // ── Pie: totales generales ────────────────────────────────────
    const totalsRow = ws.addRow([
      '', 'TOTALES', '', +totalBultos.toFixed(4),
      '', '', '', +totalPeso.toFixed(3), +totalCubicaje.toFixed(4),
    ]);
    totalsRow.font = { bold: true };

    // Subtotales por moneda
    for (const [moneda, valor] of Object.entries(subtotalesPorMoneda)) {
      ws.addRow(['', `Subtotal ${moneda}`, '', '', '', '', +valor.toFixed(2), '', '']);
    }

    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }
}
