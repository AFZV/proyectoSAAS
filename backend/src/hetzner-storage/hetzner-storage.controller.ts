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
import { SuperadminGuard } from 'src/common/guards/superadmin.guard';

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

  @UseGuards(SuperadminGuard)
  @Post('upload/logo-empresa')
  @UseInterceptors(FileInterceptor('imagen'))
  async uploadLogoEmpresa(
    @UploadedFile() imagen: Express.Multer.File,
    @Req() req: UsuarioRequest
  ) {
    if (!imagen) throw new BadRequestException('No se recibió ninguna imagen.');
    const usuario = req['usuario'];
    if (!usuario?.empresaId) throw new BadRequestException('Falta empresaId.');

    const ext = imagen.originalname.split('.').pop();
    const fileName = `logo.${ext}`;
    const folder = `empresas/${usuario.empresaId}/logos`;

    const url = await this.hetznerStorageService.uploadFile(
      imagen.buffer,
      fileName,
      folder
    );

    return { url };
  }

  @Roles('admin', 'vendedor')
  @Post('upload-product')
  @UseInterceptors(FileInterceptor('imagen'))
  async uploadProductImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('productoId') productoId: string,
    @Body('slot') slot: string,
    @Req() req: UsuarioRequest
  ) {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen.');
    const usuario = req.usuario;
    if (!usuario?.empresaId) throw new BadRequestException('Falta empresaId.');
    if (!productoId) throw new BadRequestException('Falta productoId.');
    if (!['image1', 'image2', 'image3'].includes(slot)) {
      throw new BadRequestException('Slot inválido.');
    }

    const ext = file.originalname.split('.').pop();
    const fileName = `${slot}.${ext}`;
    const folder = `empresas/${usuario.empresaId}/productos/${productoId}`;

    // ── Borrar archivos anteriores del mismo slot (cualquier extensión) ──
    await this.hetznerStorageService.deleteSlotFiles(folder, slot);
    const url = await this.hetznerStorageService.uploadFile(
      file.buffer,
      fileName,
      folder
    );

    return { url, slot };
  }
}
