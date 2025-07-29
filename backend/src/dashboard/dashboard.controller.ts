import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { UsuarioRequest } from 'src/types/request-with-usuario';

@UseGuards(UsuarioGuard, RolesGuard)
@Roles('superadmin', 'admin', 'vendedor')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('prueba')
  getPrueba() {
    return { mensaje: 'respuesta del backend' };
  }

  @Get('summary')
  async getResumen(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return await this.dashboardService.getResumen(usuario);
  }

  @Get('ventas')
  async getResumenVentas(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return await this.dashboardService.getDataGraphiscVentas(usuario);
  }

  @Get('cobros')
  async getResumenCobros(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return await this.dashboardService.getDataGraphicsCobros(usuario);
  }
}
