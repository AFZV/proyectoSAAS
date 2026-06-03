import {
  Controller,
  UseGuards,
  Get,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { EstadisticasService } from './estadisticas.service';
import { UsuarioRequest } from 'src/types/request-with-usuario';

@UseGuards(UsuarioGuard, RolesGuard)
@Roles('admin', 'vendedor', 'bodega')
@Controller('estadisticas')
export class EstadisticasController {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  @Get('stats')
  getStats(@Req() req: UsuarioRequest) {
    if (!req) throw new UnauthorizedException('usuario no autorizado');
    const usuario = req.usuario;
    return this.estadisticasService.getStats(usuario);
  }

  @Get('recomendacion-compra')
  getRecomendacionCompra(
    @Req() req: UsuarioRequest,
    @Query('periodo') periodo?: string,
    @Query('diasObjetivo') diasObjetivo?: string
  ) {
    if (!req) throw new UnauthorizedException('usuario no autorizado');
    return this.estadisticasService.getRecomendacionCompra(
      req.usuario,
      Math.max(1, parseInt(periodo ?? '30', 10)),
      Math.max(1, parseInt(diasObjetivo ?? '60', 10))
    );
  }
}
