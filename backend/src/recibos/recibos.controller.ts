import {
  Body,
  Controller,
  Headers,
  Post,
  Get,
  Delete,
  Param,
  Put,
  UnauthorizedException,
  //Res,
} from '@nestjs/common';
//import { parseISO } from 'date-fns';
//import * as XLSX from 'xlsx';
import { CrearReciboDto } from './dto/create-recibo.dto';
import { RecibosService } from './recibos.service';
import { UpdateReciboDto } from './dto/update-recibo.dto';
//import { Response } from 'express';
@Controller('recibos')
export class RecibosController {
  constructor(private recibosService: RecibosService) {}

  @Post()
  async crearRecibo(
    @Body() data: CrearReciboDto,
    @Headers('authorization') userId: string,
  ) {
    return await this.recibosService.CrearRecibo(data, userId);
  }

  @Post('exportar')
  // async exportarRecibos(
  //   @Body()
  //   body: { from: string; to: string; nombreVendedor: string; userId: string },
  //   @Res() res: Response, // Asegúrate de importar desde express
  // ) {
  //   try {
  //     const { from, to, nombreVendedor, userId } = body;
  //     const fromDate = parseISO(from);
  //     const toDate = parseISO(to);

  //     const datos = await this.recibosService.getRecaudosPorRango(
  //       fromDate,
  //       toDate,
  //       nombreVendedor,
  //       userId,
  //     );

  //     let buffer: Buffer;

  //     if (datos.length === 0) {
  //       const ws = XLSX.utils.aoa_to_sheet([['No hay datos en el rango']]);
  //       const wb = XLSX.utils.book_new();
  //       XLSX.utils.book_append_sheet(wb, ws, nombreVendedor);
  //       buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
  //     } else {
  //       const exportData = datos.map((item) => ({
  //         ID: item.id,
  //         Fecha: new Date(item.creado).toLocaleDateString('es-CO'),
  //         Nombre: item.cliente.nombres,
  //         Apellido: item.cliente.apellidos,
  //         Valor: item.valor,
  //         Tipo: item.tipo,
  //         Concepto: item.concepto,
  //         Vendedor: item.vendedor.nombres,
  //       }));

  //       const worksheet = XLSX.utils.json_to_sheet(exportData);
  //       const workbook = XLSX.utils.book_new();
  //       XLSX.utils.book_append_sheet(workbook, worksheet, nombreVendedor);
  //       buffer = XLSX.write(workbook, {
  //         bookType: 'xlsx',
  //         type: 'buffer',
  //       }) as Buffer;
  //     }

  //     res.setHeader(
  //       'Content-Type',
  //       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  //     );
  //     res.setHeader(
  //       'Content-Disposition',
  //       `attachment; filename=${nombreVendedor}.xlsx`,
  //     );

  //     return res.send(buffer); // ✅ Express's .send(Buffer)
  //   } catch (error: unknown) {
  //     if (error instanceof Error) {
  //       console.error('Error al exportar:', error.message);
  //     } else {
  //       console.error('Error inesperado al exportar:', error);
  //     }
  //     throw new Error('Error interno del servidor');
  //   }
  // }
  @Get()
  async getRecibos(@Headers('authorization') userId: string) {
    return this.recibosService.getRecibosPorUsuario(userId);
  }

  @Delete(':id')
  deleteRecibo(@Param('id') id: string) {
    return this.recibosService.eliminarRecibo(id);
  }

  @Put(':id')
  async actualizarRecibo(
    @Param('id') id: string,
    @Body() data: UpdateReciboDto,
    @Headers('authorization') userId: string,
  ) {
    if (!userId) throw new UnauthorizedException('userId requerido');
    return this.recibosService.actualizarRecibo(id, data, userId);
  }

  @Get(':id')
  async getRecibo(
    @Param('id') id: string,
    @Headers('authorization') userId: string,
  ) {
    if (!userId) throw new UnauthorizedException('userId requerido');
    return this.recibosService.getReciboPorId(id, userId);
  }
}
