import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { HetznerStorageService } from './hetzner-storage.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UsuarioRequest } from 'src/types/request-with-usuario';

@UseGuards(UsuarioGuard, RolesGuard)
@Controller('hetzner-storage')
export class HetznerStorageController {
  constructor(private readonly hetznerStorageService: HetznerStorageService) {}

  @Roles('admin', 'vendedor')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder: string
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }

    if (!folder || folder.trim() === '') {
      throw new BadRequestException('Debe especificar una carpeta destino.');
    }

    const url = await this.hetznerStorageService.uploadFile(
      file.buffer,
      file.originalname,
      folder
    );

    return { url };
  }

  @Roles('admin', 'vendedor')
  @Post('upload-product')
  @UseInterceptors(FileInterceptor('imagen'))
  async uploadProductImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: UsuarioRequest
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ninguna imagen.');
    }

    const usuario = req.usuario;

    if (!usuario?.empresaId) {
      throw new BadRequestException('Falta empresaId en el usuario.');
    }

    const folder = `empresas/${usuario.empresaId}/productos`;

    const url = await this.hetznerStorageService.uploadFile(
      file.buffer,
      file.originalname,
      folder
    );

    return { url };
  }
}
