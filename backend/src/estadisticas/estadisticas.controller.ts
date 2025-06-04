import { Controller, UseGuards } from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { EstadisticasService } from './estadisticas.service';

@UseGuards(UsuarioGuard, RolesGuard)
@Roles('admin', 'vendedor', 'bodega')
@Controller('estadisticas')
export class EstadisticasController {
  constructor(private readonly estadisticasService: EstadisticasService) {}
}
