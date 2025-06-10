import {
  Body,
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UnauthorizedException,
  Req,
  UseGuards,
  Patch,
  //Res,
} from '@nestjs/common';
//import { parseISO } from 'date-fns';
//import * as XLSX from 'xlsx';
import { CrearReciboDto } from './dto/create-recibo.dto';
import { RecibosService } from './recibos.service';
import { UpdateReciboDto } from './dto/update-recibo.dto';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@UseGuards(UsuarioGuard, RolesGuard)
@Controller('recibos')
export class RecibosController {
  constructor(private recibosService: RecibosService) {}
  //endpoint para obtener todos los recibos si es admin o solo los del usuario logueado
  @Roles('admin', 'vendedor')
  @Get('/all')
  async getRecibos(@Req() req: UsuarioRequest) {
    console.log('Usuario recibido en controlador:', req.usuario);
    const usuario = req.usuario;
    //console.log('este es el usuario en back:', usuario);
    return this.recibosService.getRecibos(usuario);
  }

  //endpoint para crear un recibo
  @Roles('admin', 'vendedor')
  @Post()
  async crearRecibo(@Body() data: CrearReciboDto, @Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return await this.recibosService.crearRecibo(data, usuario);
  }

  /// endpoint para actualizar cualquier o todos los campos de un recibo
  @Roles('admin')
  @Patch(':id')
  async actualizarRecibo(
    @Param('id') id: string,
    @Body() data: UpdateReciboDto,
    @Req() req: UsuarioRequest,
  ) {
    const usuario = req.usuario;
    if (!usuario) throw new UnauthorizedException('userId requerido');
    return this.recibosService.actualizarRecibo(id, data, usuario);
  }

  //endpoint para retornar un recibo por su id
  @Roles('admin', 'vendedor')
  @Get(':id')
  async getRecibo(@Param('id') id: string, @Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return this.recibosService.getReciboPorId(id, usuario);
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
  @Delete(':id')
  deleteRecibo(@Param('id') id: string) {
    return this.recibosService.eliminarRecibo(id);
  }
}
