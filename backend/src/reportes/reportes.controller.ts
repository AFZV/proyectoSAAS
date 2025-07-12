// reportes.controller.ts
import {
  Controller,
  Post,
  Req,
  Body,
  Param,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportesService } from './reportes.service';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { buildExcel, ColumnDef } from './excel.builder';
import { CrearReporteInvDto } from './dto/crear-reporte-inventario.dto';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { Roles } from 'src/common/decorators/roles.decorator';

@UseGuards(UsuarioGuard, RolesGuard)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}
  @Roles('admin')
  @Post('inventario/:format')
  async createInventarioReport(
    @Req() req: UsuarioRequest,
    @Body() data: CrearReporteInvDto,
    @Param('format') format: 'excel' | 'pdf',
    @Res() res: Response
  ) {
    const usuario = req.usuario;
    const rows = await this.reportesService.inventarioValor(usuario, data);

    const columns: ColumnDef<(typeof rows)[0]>[] = [
      { header: 'Nombre', key: 'nombre', width: 40 },
      { header: 'Cantidad', key: 'cantidades', width: 12, numFmt: '#,##0' },
      {
        header: 'Valor Unitario',
        key: 'precio',
        width: 14,
        numFmt: '[$$-en-US]#,##0.00',
      },
      {
        header: 'Total',
        key: 'total',
        width: 20,
        numFmt: '[$$-en-US]#,##0.00',
      },
    ];

    if (format === 'excel') {
      const wb = buildExcel('Reporte de Inventario', columns, rows);
      res
        .status(HttpStatus.OK)
        .set({
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition':
            'attachment; filename="reporte-inventario.xlsx"',
        });
      await wb.xlsx.write(res);
      return res.end();
    }
  }

  //Reporte de clientes
  @Roles('admin')
  @Post('clientes/:format')
  async createClientesReport(
 
  ) {
    const usuario = req.usuario;
      const rows = await this.reportesService.clientesAll(usuario);

      const columns: ColumnDef<(typeof rows)[0]>[] = [
        { header: 'ID', key: 'id', width: 35 },
        { header: 'Nit', key: 'nit', width: 25 },
        { header: 'Nombre', key: 'nombre', width: 30 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Teléfono', key: 'telefono', width: 15 },
        { header: 'Direccion', key: 'direccion', width: 15 },
        { header: 'Departamento', key: 'departamento', width: 20 },
        { header: 'Ciudad', key: 'ciudad', width: 20 },
        { header: 'Razon Social', key: 'rasonZocial', width: 30 },
      ];

      if (format === 'excel') {
        const wb = buildExcel('Reporte de Clientes', columns, rows);
      res.status(HttpStatus.OK).set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="reporte-clientes.xlsx"',
      });
      await wb.xlsx.write(res);
      return res.end();
    }
  }

  //Reporte de pedidos
  @Roles('admin')
  @Post('pedidos/:format')
  async createPedidosReport(
       @Req() req: UsuarioRequest,
    @Param('format') format: 'excel' | 'pdf',
    @Res() res: Response
  ) {
    const usuario = req.usuario;
    const rows = await this.reportesService.pedidosAll(usuario);

    const columns: ColumnDef<(typeof rows)[0]>[] = [
      { header: 'ID', key: 'id', width: 35 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Fecha', key: 'fecha', width: 25 },
      { header: 'Total', key: 'total', width: 20 },
      { header: 'Estado', key: 'estado', width: 20 },
      {header: 'Vendedor', key: 'vendedor', width: 30},
    ];

    if (format === 'excel') {
      const wb = buildExcel('Reporte de Pedidos', columns, rows);
      res.status(HttpStatus.OK).set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="reporte-pedidos.xlsx"',
      });
      await wb.xlsx.write(res);
      return res.end();
    }
  }
