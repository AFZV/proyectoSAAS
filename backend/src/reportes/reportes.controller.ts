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
import { CrearReporteClienteCiudadDto } from './dto/crear-reporte-clientciudad-dto';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CrearReporteRangoProductoDto } from './dto/crear-reporte-rango-producto.dto';

@UseGuards(UsuarioGuard, RolesGuard)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}
  //Reporte de productos con inventario
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
      res.status(HttpStatus.OK).set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="reporte-inventario.xlsx"',
      });
      await wb.xlsx.write(res);
      return res.end();
    }
  }
  //Reporte de productos por rango de letras Iniciales
  @Roles('admin')
  @Post('inventario/rango/:format')
  async createInventarioRangoReport(
    @Req() req: UsuarioRequest,
    @Body() data: CrearReporteRangoProductoDto,
    @Param('format') format: 'excel' | 'pdf',
    @Res() res: Response
  ) {
    const usuario = req.usuario;
    const rows = await this.reportesService.inventarioPorRango(usuario, data);

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
      const wb = buildExcel(
        `Inventario ${data.inicio}-${data.fin}`,
        columns,
        rows
      );
      res.status(HttpStatus.OK).set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Reporte_inventario_productos_de_${data.inicio}_hasta_${data.fin}.xlsx"`,
      });
      await wb.xlsx.write(res);
      return res.end();
    }
  }
  //Reporte de clientes por ciudad
  @Roles('admin')
  @Post('clientes/ciudad/:format')
  async createClientesCiudadReport(
    @Req() req: UsuarioRequest,
    @Param('format') format: 'excel' | 'pdf',
    @Body() data: CrearReporteClienteCiudadDto,
    @Res() res: Response
  ) {
    const usuario = req.usuario;
    const rows = await this.reportesService.clientesPorCiudad(usuario, data);

    const columns: ColumnDef<(typeof rows)[0]>[] = [
      { header: 'ID Cliente', key: 'id', width: 36 },
      { header: 'NIT', key: 'nit', width: 20 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Teléfono', key: 'telefono', width: 18 },
      { header: 'Dirección', key: 'direccion', width: 40 },
      { header: 'Departamento', key: 'departamento', width: 20 },
      { header: 'Ciudad', key: 'ciudad', width: 20 },
      { header: 'Razon Social', key: 'rasonZocial', width: 30 },
    ];

    if (format === 'excel') {
      const wb = buildExcel('Reporte de Clientes por Ciudad', columns, rows);
      res.status(HttpStatus.OK).set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename="clientes-por-ciudad.xlsx"',
      });
      await wb.xlsx.write(res);
      return res.end();
    }
  }

  //Reporte de clientes
  @Roles('admin')
  @Post('clientes/:format')
  async createClientesReport(
    @Req() req: UsuarioRequest,
    @Param('format') format: 'excel' | 'pdf',
    @Res() res: Response
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

  //Reporte de clientes por vendedor
  @Roles('admin')
  @Post('clientes/vendedor/:id/:format')
  async createClientesPorVendedorReport(
    @Req() req: UsuarioRequest,
    @Param('format') format: 'excel' | 'pdf',
    @Param('id') vendedorId: string,
    @Res() res: Response
  ) {
    const usuario = req.usuario;
    const rows = await this.reportesService.clientesPorVendedor(
      usuario,
      vendedorId
    );

    const columns: ColumnDef<(typeof rows)[0]>[] = [
      { header: 'ID Cliente', key: 'id', width: 36 },
      { header: 'NIT', key: 'nit', width: 20 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Teléfono', key: 'telefono', width: 18 },
      { header: 'Dirección', key: 'direccion', width: 40 },
      { header: 'Departamento', key: 'departamento', width: 20 },
      { header: 'Ciudad', key: 'ciudad', width: 20 },
      { header: 'Razon Social', key: 'rasonZocial', width: 30 },
    ];

    if (format === 'excel') {
      const wb = buildExcel('Reporte de Clientes por Vendedor', columns, rows);
      res.status(HttpStatus.OK).set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename="clientes-por-vendedor.xlsx"',
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
    @Body() data: CrearReporteInvDto,
    @Param('format') format: 'excel' | 'pdf',
    @Res() res: Response
  ) {
    const usuario = req.usuario;
    const rows = await this.reportesService.pedidosAll(usuario, data);

    const columns: ColumnDef<(typeof rows)[0]>[] = [
      { header: 'ID', key: 'id', width: 35 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Fecha', key: 'fecha', width: 25 },
      {
        header: 'Total',
        key: 'total',
        width: 20,
        numFmt: '[$$-en-US]#,##0.00',
      },
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

  //Reporte de pedidos por vendedor
  @Roles('admin')
  @Post('pedidos/:format/:id')
  async createPedidosPorVendedorReport(
    @Req() req: UsuarioRequest,
    @Param('format') format: 'excel' | 'pdf',
    @Param('id') vendedorId: string,
    @Body() data: CrearReporteInvDto,
    @Res() res: Response
  ) {
    const usuario = req.usuario;
    const rows = await this.reportesService.pedidosPorVendedor(
      usuario,
      vendedorId,
      data
    );

    const columns: ColumnDef<(typeof rows)[0]>[] = [
      { header: 'ID', key: 'id', width: 35 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Fecha', key: 'fecha', width: 25 },
      {
        header: 'Total',
        key: 'total',
        width: 20,
        numFmt: '[$$-en-US]#,##0.00',
      },
    ];

    if (format === 'excel') {
      const wb = buildExcel('Reporte de Pedidos por Vendedor', columns, rows);
      res.status(HttpStatus.OK).set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename="reporte-pedidos-vendedor.xlsx"',
      });
      await wb.xlsx.write(res);
      return res.end();
    }
  }
}
