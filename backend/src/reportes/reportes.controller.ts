import {
  Controller,
  Res,
  UseGuards,
  Req,
  Body,
  Post,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { ReportesService } from './reportes.service';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CrearReporteInvDto } from './dto/crear-reporte-inventario.dto';
import { UsuarioRequest } from 'src/types/request-with-usuario';

@UseGuards(UsuarioGuard, RolesGuard)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Roles('admin', 'vendedor')
  @Post('')
  async createReporte(
    @Req() req: UsuarioRequest,
    @Body() data: CrearReporteInvDto,
    @Res() res: Response,
  ) {
    const usuario = req.usuario;

    // Obtenemos datos via Prisma
    const rows = await this.reportesService.inventarioValor(usuario, data);

    // Creamos el archivo excel
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Reporte de Inventario');
    sheet.addRow(['Nombre', 'Cantidad', 'Total']);
    rows.forEach((r) => sheet.addRow([r.nombre, r.cantidades, r.total]));

    sheet.columns = [
      { width: 30 }, // Nombre
      { width: 12, style: { numFmt: '#,##0' } }, // Cantidad
      { width: 14, style: { numFmt: '[$$-en-US]#,##0.00' } },
    ];

    //Devolver el archivo excel ya construido
    res
      .status(HttpStatus.OK)
      .set({
        'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
        'attachment; filename="reporte-inventario.xlsx"',
      });

    await wb.xlsx.write(res);
    res.end();
  }
}
