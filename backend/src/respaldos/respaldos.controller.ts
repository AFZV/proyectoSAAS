import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { RespaldosService } from './respaldos.service';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Response } from 'express';

@UseGuards(UsuarioGuard, RolesGuard)
@Roles('admin')
@Controller('respaldos')
export class RespaldosController {
  constructor(private readonly respaldosService: RespaldosService) {}

  @Get('copia')
  async doCopy(@Req() req: UsuarioRequest, @Res() res: Response) {
    const usuario = req.usuario;

    // ✅ Usamos el método que genera y guarda el respaldo
    const { buffer, fileName } =
      await this.respaldosService.exportarRespaldoYGuardar(usuario);

    // Enviar el archivo como descarga
    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
  @Post('restaurar')
  async restaurarRespaldo(
    @Req() req: UsuarioRequest,
    @Body('base64') base64: string
  ) {
    const usuario = req.usuario;
    if (!base64) throw new BadRequestException('Archivo inválido');

    await this.respaldosService.restaurarDesdeRespaldo(usuario, base64);
    return { message: 'Restauración exitosa' };
  }
}
