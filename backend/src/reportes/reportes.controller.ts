import {
  Controller,
  Res,
  UseGuards,
  Req,
  Body,
  Post,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportesService } from './reportes.service';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CrearReporteInvDto } from './dto/crear-reporte-inventario.dto';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { buildInventarioPDF } from './pdf.builder';
import { buildInventarioExcel } from './excel.builder';

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
      const wb = await buildInventarioExcel(rows);
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
    } else {
      //Reporte en PDF
      // — Configuramos cabeceras HTTP —
      res
        .status(HttpStatus.OK)
        .set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="reporte-inventario.pdf"',
        });
      // Usamos la función buildInventarioPDF para crear el documento PDF
      const doc = buildInventarioPDF(rows);
      doc.pipe(res);
    }
  }
}
