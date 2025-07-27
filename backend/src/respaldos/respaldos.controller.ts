import {
  Controller,
  Get,
  Res,
  Req,
  UseGuards,
  InternalServerErrorException,
} from '@nestjs/common';
import { RespaldosService } from './respaldos.service';
import { Response } from 'express';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@UseGuards(UsuarioGuard, RolesGuard)
@Controller('respaldos')
export class RespaldosController {
  constructor(private readonly respaldosService: RespaldosService) {}

  /**
   * ✅ Generar respaldo en formato SQL (.sql) para la empresa actual
   * Incluye `INSERT ... ON CONFLICT DO UPDATE` para evitar duplicados
   */
  @Roles('admin')
  @Get('copia')
  async generarCopia(@Res() res: Response, @Req() req: UsuarioRequest) {
    try {
      const usuario = req.usuario;
      if (!usuario?.empresaId) {
        throw new InternalServerErrorException(
          'Empresa no encontrada en el token'
        );
      }

      const empresaId = usuario.empresaId;

      // ✅ Llamar al servicio para crear archivo SQL y JSON
      const { sqlPath, fileNameSql } =
        await this.respaldosService.generarRespaldoEmpresa(empresaId);

      // ✅ Configurar headers
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileNameSql}"`
      );

      // ✅ Descargar archivo .sql
      res.download(sqlPath, fileNameSql, (err) => {
        if (err) {
          console.error('❌ Error al enviar respaldo:', err);
          res.status(500).send('Error enviando respaldo');
        }
      });
    } catch (error) {
      console.error('❌ Error en generarCopia:', error);
      throw new InternalServerErrorException('Error generando respaldo');
    }
  }
}
