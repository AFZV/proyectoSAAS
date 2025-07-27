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
  Get,
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
  constructor(private readonly reportesService: ReportesService) { }
  //Reporte de carga de inventario
  @Roles('admin')
  @Get('/inventario/productos/:format')
  async RestoreBackuproduct(
    @Req() req: UsuarioRequest,
    @Param('format') format: 'excel' | 'pdf',
    @Res() res: Response
  ) {
    const usuario = req.usuario;
    const rows = await this.reportesService.inventarioCompleto(usuario);

    const columns: ColumnDef<(typeof rows)[0]>[] = [
      { header: 'Id Productos', key: 'id', width: 60 },
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
      const wb = buildExcel('Backup para cargar Inventario', columns, rows);
      res.status(HttpStatus.OK).set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="backuprecov.xlsx"',
      });
      await wb.xlsx.write(res);
      return res.end();
    }
  }
  //Reporte de productos con inventario
  @Roles('admin')
  @Get('inventario/:format')
  async createInventarioReport(
    @Req() req: UsuarioRequest,
    @Param('format') format: 'excel' | 'pdf',
    @Res() res: Response
  ) {
    const usuario = req.usuario;
    const rows = await this.reportesService.inventarioValor(usuario);

    const columns: ColumnDef<(typeof rows)[0]>[] = [
      { header: 'ID producto', key: 'id', width: 60 },
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
      { header: 'Vendedor', key: 'vendedor', width: 30 },
      { header: 'ID_Cliente', key: 'id', width: 35 },
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

  //Pedidos con saldo pendiente
  @Roles('admin')
  @Post('cartera/:format')
  async exportarCartera(
    @Req() req: UsuarioRequest,
    @Param('format') format: 'excel' | 'pdf',
    @Body() dto: CrearReporteInvDto,
    @Res() res: Response
  ) {
    const usuario = req.usuario;
    const rows = await this.reportesService.saldosPendientesPorPedido(
      usuario,
      dto
    );

    // Si piden Excel, construyo el workbook
    if (format === 'excel') {
      const columns: ColumnDef<(typeof rows)[0]>[] = [
        { header: 'ID Pedido', key: 'id', width: 36 },
        { header: 'Cliente', key: 'cliente', width: 40 },
        {
          header: 'Fecha Pedido',
          key: 'fecha',
          width: 20,
          numFmt: 'dd/mm/yyyy',
        },
        {
          header: 'Saldo Pendiente',
          key: 'saldoPendiente',
          width: 18,
          numFmt: '#,##0.00',
        },
      ];
      const wb = buildExcel('Cartera Pendiente', columns, rows);

      res.status(HttpStatus.OK).set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="cartera-pendiente.xlsx"',
      });
      await wb.xlsx.write(res);
      return res.end();
    }

    // Si no es excel, simplemente devolvemos JSON
    return res.status(HttpStatus.OK).json({
      message: 'Cartera pendiente',
      data: rows,
    });
  }

  //Reporte de pedidos con saldo pendiente por vendedor
  @Roles('admin')
  @Post('cartera/:format/vendedor/:vendedorId')
  async exportarCarteraPorVendedor(
    @Req() req: UsuarioRequest,
    @Param('format') format: 'excel' | 'pdf',
    @Param('vendedorId') vendedorId: string,
    @Body() dto: CrearReporteInvDto,
    @Res() res: Response
  ) {
    const usuario = req.usuario;
    const rows = await this.reportesService.saldosPendientesPorPedidoVendedor(
      usuario,
      vendedorId,
      dto
    );

    // Excel
    if (format === 'excel') {
      const columns: ColumnDef<(typeof rows)[0]>[] = [
        { header: 'ID Pedido', key: 'id', width: 36 },
        { header: 'Cliente', key: 'cliente', width: 40 },
        {
          header: 'Fecha Pedido',
          key: 'fecha',
          width: 20,
          numFmt: 'dd/mm/yyyy',
        },
        {
          header: 'Saldo Pendiente',
          key: 'saldoPendiente',
          width: 18,
          numFmt: '#,##0.00',
        },
      ];
      const wb = buildExcel('Cartera Pendiente por Vendedor', columns, rows);
      res.status(HttpStatus.OK).set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename="cartera-pendiente-vendedor.xlsx"',
      });
      await wb.xlsx.write(res);
      return res.end();
    }

    // JSON fallback
    return res.status(HttpStatus.OK).json({
      message: 'Cartera pendiente para vendedor',
      data: rows,
    });
  }

  //Reporte de balance general de cartera
  @Roles('admin')
  @Post('balance-general/:format')
  async createBalanceGeneralReport(
    @Req() req: UsuarioRequest,
    @Param('format') format: 'excel' | 'pdf',
    @Res() res: Response
  ) {
    const usuario = req.usuario;
    // 1) Obtener datos
    const rows = await this.reportesService.reporteBalanceGeneral(usuario);

    // 2) Definir columnas
    const columns: ColumnDef<(typeof rows)[0]>[] = [
      { header: 'Vendedor', key: 'vendedor', width: 20 },
      { header: 'ID Cliente', key: 'clienteId', width: 30 },
      { header: 'Nombre', key: 'nombre', width: 35 },
      { header: 'NIT', key: 'nit', width: 20 },
      { header: 'Razón Social', key: 'razonSocial', width: 30 },
      { header: 'Ciudad', key: 'ciudad', width: 20 },
      {
        header: 'Total Deuda',
        key: 'totalDeuda',
        width: 25,
        numFmt: '#,##0.00',
      },
    ];

    // 3) Generar y devolver Excel o PDF
    if (format === 'excel') {
      const wb = buildExcel('Balance General', columns, rows);
      res.status(HttpStatus.OK).set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="balance-general.xlsx"',
      });
      await wb.xlsx.write(res);
      return res.end();
    }

    // — Si luego quieres PDF —
    // const doc = buildBalanceGeneralPDF(rows);
    // doc.pipe(res);
  }

  //Reporte de  Recaudo por fecha
  @Roles('admin')
  @Post('recaudo/:format')
  async createRecaudoReport(
    @Req() req: UsuarioRequest,
    @Param('format') format: 'excel' | 'pdf',
    @Body() dto: CrearReporteInvDto,
    @Res() res: Response
  ) {
    const usuario = req.usuario;
    // 1) Obtener datos
    const rows = await this.reportesService.reporteRecaudo(usuario, dto);

    // 2) Definir columnas
    const columns: ColumnDef<(typeof rows)[0]>[] = [
      { header: 'ID Recibo', key: 'reciboId', width: 40 },
      { header: 'Fecha', key: 'fecha', width: 35 },
      { header: 'Tipo', key: 'tipo', width: 20 },
      { header: 'Valor', key: 'valor', width: 25, numFmt: '#,##0.00' },
      { header: 'Vendedor', key: 'vendedor', width: 20 },
      { header: 'Concepto', key: 'concepto', width: 45 },
    ];

    // 3) Generar y devolver Excel o PDF
    if (format === 'excel') {
      const wb = buildExcel('Recaudo', columns, rows);
      res.status(HttpStatus.OK).set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="recaudo.xlsx"',
      });
      await wb.xlsx.write(res);
      return res.end();
    }
  }

  //Reporte de  Recaudo por fecha y vendedor
  @Roles('admin')
  @Post('recaudo-vendedor/:id/:format')
  async createRecaudoVendedorReport(
    @Req() req: UsuarioRequest,
    @Param('id') vendedorId: string,
    @Param('format') format: 'excel' | 'pdf',
    @Body() dto: CrearReporteInvDto,
    @Res() res: Response
  ) {
    const usuario = req.usuario;
    // 1) Obtener datos
    const rows = await this.reportesService.reporteRecaudoVendedor(
      usuario,
      dto,
      vendedorId
    );

    // 2) Definir columnas
    const columns: ColumnDef<(typeof rows)[0]>[] = [
      { header: 'ID Recibo', key: 'reciboId', width: 40 },
      { header: 'Fecha', key: 'fecha', width: 35 },
      { header: 'Tipo', key: 'tipo', width: 20 },
      { header: 'Valor', key: 'valor', width: 25, numFmt: '#,##0.00' },
      { header: 'Concepto', key: 'concepto', width: 45 },
    ];

    // 3) Generar y devolver Excel o PDF
    if (format === 'excel') {
      const wb = buildExcel('Recaudo por Vendedor', columns, rows);
      res.status(HttpStatus.OK).set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="recaudo-vendedor.xlsx"',
      });
      await wb.xlsx.write(res);
      return res.end();
    }
  }
}
