import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UsuarioRequest } from 'src/types/request-with-usuario';

@UseGuards(UsuarioGuard, RolesGuard)
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Roles('admin', 'superadmin')
  @Get()
  getLogsEmpresa(
    @Req() req: UsuarioRequest,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('entidad') entidad?: string,
  ) {
    return this.auditoriaService.getLogsEmpresa(
      req.usuario.empresaId,
      +page,
      +limit,
      entidad,
    );
  }

  @Roles('admin', 'superadmin', 'vendedor')
  @Get('entidad/:entidad/:id')
  getLogsPorEntidad(
    @Req() req: UsuarioRequest,
    @Param('entidad') entidad: string,
    @Param('id') id: string,
  ) {
    return this.auditoriaService.getLogsPorEntidad(
      req.usuario.empresaId,
      entidad,
      id,
    );
  }
}
