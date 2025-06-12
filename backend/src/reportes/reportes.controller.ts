import {
  Controller,
  Res,
  UseGuards,
  Req,
  Body,
  Post,
  HttpStatus,
  Query,
  Param,
} from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import { buffer as getStreamBuffer } from 'get-stream';
import { ReportesService } from './reportes.service';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CrearReporteInvDto } from './dto/crear-reporte-inventario.dto';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { get } from 'http';

@UseGuards(UsuarioGuard, RolesGuard)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Roles('admin', 'vendedor')
  @Post(':format')
  async createReporte(
    @Req() req: UsuarioRequest,
    @Body() data: CrearReporteInvDto,
    @Res() res: Response,
    @Param('format') format: string,
  ) {
    const usuario = req.usuario;

    // Obtenemos datos via Prisma
    const rows = await this.reportesService.inventarioValor(usuario, data);
    //Reporte en excel
    if (format === 'excel') {
      // Creamos el archivo excel
      const wb = new ExcelJS.Workbook();
      const sheet = wb.addWorksheet('Reporte de Inventario');
      sheet.addRow(['Nombre', 'Cantidad', 'Valor Unitario', 'Total']);
      rows.forEach((r) => {
        sheet.addRow([r.nombre, r.cantidades, r.precio, r.total]);
      });

      sheet.columns = [
        { width: 40 }, // Nombre
        { width: 12, style: { numFmt: '#,##0' } }, // Cantidad
        { width: 14, style: { numFmt: '[$$-en-US]#,##0.00' } }, // Valor Unitario
        { width: 18, style: { numFmt: '[$$-en-US]#,##0.00' } }, // Total
      ];

      //Devolver el archivo excel ya construido
      res.status(HttpStatus.OK).set({
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="reporte-inventario.xlsx"',
        });

      await wb.xlsx.write(res);
      res.end();
    } else {
      //Reporte en PDF
      // configuramos cabeceras
      res
        .status(HttpStatus.OK)
        .set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="reporte-inventario.pdf"',
        });

      // creamos y _pipeamos_ el PDFDocument directamente al response
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      doc.pipe(res);

      // título
      doc.fontSize(20).text('Reporte de Inventario', { align: 'center' }).moveDown();

      // cabeceras de la tabla
      let y = doc.y;
      const rowH = 20;
      doc
        .fontSize(12)
        .text('Nombre', 50, y)
        .text('Cantidad', 300, y)
        .text('Valor Unitario', 380, y)
        .text('Total', 480, y);
      y += rowH;

      // filas
      rows.forEach((r) => {
        doc
          .text(r.nombre, 50, y, { width: 240 })
          .text(r.cantidades.toString(), 300, y, { width: 50, align: 'right' })
          .text(r.precio.toFixed(2), 380, y, { width: 80, align: 'right' })
          .text(r.total.toFixed(2), 480, y, { width: 80, align: 'right' });
        y += rowH;
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
      });

      // cerramos el documento
      doc.end();
      // ¡No hace falta ni await ni res.send ni buffers!
    }
  }
}
