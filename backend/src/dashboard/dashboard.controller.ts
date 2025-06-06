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
  getResume() {
    return { mensaje: 'respuesta del backend' };
  }

  @Get('summary')
  getResumen(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return this.dashboardService.getResumen(usuario);
  }

  @Get('ventas')
  getResumeVentas(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return this.dashboardService.getDataGraphiscVentas(usuario);
  }

  @Get('cobros')
  getResumeCobros(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;

    return this.dashboardService.getDataGraphicsCobros(usuario);
  }
}
