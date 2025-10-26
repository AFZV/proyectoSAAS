import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { BalanceService } from './balance.service';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { CrearAjusteManualDto } from './dto/create-ajuste.dto';

@UseGuards(UsuarioGuard, RolesGuard)
@Roles('admin')
@Controller('balance')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get('total')
  obtenerSaldos(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return this.balanceService.ctasPorCobrar(usuario);
  }
  @Get('balancePorCliente/:id')
  obtenerSaldoCliente(@Param('id') id: string, @Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return this.balanceService.saldoPorCliente(id, usuario);
  }
  @Get('movimientos/:idCliente')
  obtenerMovimientos(
    @Param('idCliente') idCliente: string,
    @Req() req: UsuarioRequest
  ) {
    const usuario = req.usuario;
    return this.balanceService.movimientosCarteraCliente(idCliente, usuario);
  }

  @Roles('admin')
  @Post('ajusteManual')
  crearAjusteManual(
    @Body() data: CrearAjusteManualDto,
    @Req() req: UsuarioRequest
  ) {
    if (!req.usuario) throw new UnauthorizedException('no esta autorizado');
    const usuario = req.usuario;
    return this.balanceService.ajusteManual(data, usuario);
  }

  @Roles('admin')
  @Get('stats/:clienteId')
  getStats(@Param('clienteId') clienteId: string, @Req() req: UsuarioRequest) {
    if (!req.usuario) throw new UnauthorizedException('no esta autorizado');
    const usuario = req.usuario;
    return this.balanceService.stats(usuario, clienteId);
  }

  @Roles('admin', 'vendedor')
  @Get('resumenVencimientos')
  getResumenVencimientos(@Req() req: UsuarioRequest) {
    if (!req.usuario) throw new UnauthorizedException('no esta autorizado');
    const usuario = req.usuario;
    return this.balanceService.statatsVencimientos(usuario);
  }
  @Roles('admin', 'vendedor')
  @Get('saldos-por-cliente')
  getSaldosPorCliente(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return this.balanceService.saldosPorCliente(usuario);
  }
  @Roles('admin', 'vendedor')
  @Get('movimientos/porCliente/:clienteId')
  movimientosPorCliente(
    @Req() req: UsuarioRequest,
    @Param('clienteId') clienteId: string
  ) {
    const usuario = req.usuario;
    return this.balanceService.movimientosCliente(usuario, clienteId);
  }
}
