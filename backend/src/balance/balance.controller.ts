import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { BalanceService } from './balance.service';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UsuarioRequest } from 'src/types/request-with-usuario';

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
  @Get(':id')
  obtenerSaldoCliente(@Param('id') id: string, @Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return this.balanceService.saldoPorCliente(id, usuario);
  }
  @Get('movimientos/:idCliente')
  obtenerMovimientos(
    @Param('idCliente') idCliente: string,
    @Req() req: UsuarioRequest,
  ) {
    const usuario = req.usuario;
    return this.balanceService.movimientosCarteraCliente(idCliente, usuario);
  }
}
