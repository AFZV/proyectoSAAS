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
  BadRequestException,

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

  @Roles('admin', 'vendedor')
  @Get('PedidosSaldoPendiente/:idCliente')
  getPedidosConSaldo(
    @Param('idCliente') idCliente: string,
    @Req() req: UsuarioRequest
  ) {
    if (!req.usuario) throw new BadRequestException('el usuario es requerido');
    const usuario = req.usuario;
    return this.recibosService.obtenerPedidosConSaldoPorCliente(
      idCliente,
      usuario
    );
  }

  //endpoint para obtener todos los recibos si es admin o solo los del usuario logueado
  @Roles('admin', 'vendedor')
  @Get('all')
  async getRecibos(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;

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
    @Req() req: UsuarioRequest
  ) {
    const usuario = req.usuario;
    if (!usuario) throw new UnauthorizedException('no permitido');
    return this.recibosService.actualizarRecibo(id, data, usuario);
  }

  //endpoint para retornar un recibo por su id
  @Roles('admin')
  @Get('getById:id')
  async getRecibo(@Param('id') id: string, @Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return this.recibosService.getReciboPorId(id, usuario);
  }
  @Roles('admin', 'vendedor')
  @Get('getStats/summary')
  async resumenRecibos(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return this.recibosService.getResumen(usuario);
  }

  @Patch(':id/revisado')
  @Roles('admin')
  async marcarRevisado(@Param('id') id: string, @Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    const revisado = await this.recibosService.marcarRevisado(usuario, id);
    return { revisado }; // 👈 siempre JSON boolean real
  }

  @Delete(':id')
  deleteRecibo(@Param('id') id: string) {
    return this.recibosService.eliminarRecibo(id);
  }
}
