import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { RespaldosService } from './respaldos.service';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@UseGuards(UsuarioGuard, RolesGuard)
@Roles('admin')
@Controller('respaldos')
export class RespaldosController {
  constructor(private readonly respaldosService: RespaldosService) {}

  @Get('copia')
  async generarCopia(@Req() req: UsuarioRequest) {
    const empresaId = req.usuario?.empresaId;
    if (!empresaId) throw new InternalServerErrorException('Empresa no encontrada en el token');

    try {
      const result = await this.respaldosService.generarRespaldoEmpresa(empresaId);
      return { ok: true, mensaje: 'Respaldo generado y guardado en la nube', ...result };
    } catch (error) {
      throw new InternalServerErrorException('Error generando respaldo: ' + (error as Error).message);
    }
  }

  @Get('lista')
  async listar(@Req() req: UsuarioRequest) {
    const empresaId = req.usuario?.empresaId;
    if (!empresaId) throw new InternalServerErrorException('Empresa no encontrada en el token');

    try {
      return await this.respaldosService.listarRespaldos(empresaId);
    } catch (error) {
      throw new InternalServerErrorException('Error listando respaldos: ' + (error as Error).message);
    }
  }

  @Get('descargar')
  async descargar(@Query('key') key: string) {
    if (!key) throw new BadRequestException('Parámetro key requerido');

    try {
      const url = await this.respaldosService.getUrlDescarga(key);
      return { url };
    } catch (error) {
      throw new InternalServerErrorException('Error generando URL de descarga: ' + (error as Error).message);
    }
  }
}
