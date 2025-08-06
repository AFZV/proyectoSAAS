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
    @Body('folder') folder: string // ej: "empresas/123/pedidos"
  ) {
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
    if (!file) throw new BadRequestException('No se envió archivo');

    const usuario = req.usuario; // contiene empresaId si tu guard lo inyecta
    if (!usuario?.empresaId) throw new BadRequestException('Falta empresa');

    const folder = `empresas/${usuario.empresaId}/productos`;
    const url = await this.hetznerStorageService.uploadFile(
      file.buffer,
      file.originalname,
      folder
    );

    return { url };
  }
}
