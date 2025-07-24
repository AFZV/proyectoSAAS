import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { RespaldosService } from './respaldos.service';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

@UseGuards(UsuarioGuard, RolesGuard)
@Roles('admin')
@Controller('respaldos')
export class RespaldosController {
  constructor(private readonly respaldosService: RespaldosService) {}

  @Get('copia')
  async generarCopia(@Req() req: UsuarioRequest, @Res() res: Response) {
    const usuario = req.usuario;
    const { filePath, fileName } =
      await this.respaldosService.generarRespaldoPorEmpresa(usuario.empresaId);

    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Error al enviar respaldo:', err);
        res.status(500).send('Error enviando respaldo');
      }
    });
  }

  @Post('restaurar')
  @UseInterceptors(FileInterceptor('file'))
  async restaurarDesdeArchivo(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: UsuarioRequest
  ) {
    if (!file || !file.originalname.endsWith('.sql.gz')) {
      throw new BadRequestException('El archivo debe ser un .sql.gz válido');
    }

    const usuario = req.usuario;
    return await this.respaldosService.restaurarDesdeArchivo(
      file.path,
      usuario.empresaId
    );
  }
}
