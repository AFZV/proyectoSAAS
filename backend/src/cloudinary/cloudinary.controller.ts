import {
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { FileInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { SuperadminGuard } from 'src/common/guards/superadmin.guard';

@UseGuards(UsuarioGuard, RolesGuard, SuperadminGuard)
@Roles('admin', 'superadmin')
@Controller('cloudinary')
export class CloudinaryController {
  constructor(private cloudinaryService: CloudinaryService) {}

  @Post('upload/producto')
  @UseInterceptors(FileInterceptor('imagen'))
  async uploadImagenProducto(
    @UploadedFile() imagen: Express.Multer.File,
    @Req() req: UsuarioRequest
  ) {
    const { buffer, originalname } = imagen;
    const usuario = req.usuario;

    const result = await this.cloudinaryService.uploadProductImage({
      buffer,
      fileName: originalname,
      empresaId: usuario.empresaId,
    });

    return { url: result.url };
  }

  @Post('upload/logo-empresa')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogoEmpresa(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: UsuarioRequest
  ) {
    const { buffer, originalname } = file;
    const usuario = req.usuario;

    const result = await this.cloudinaryService.uploadLogoEmpresa({
      buffer,
      fileName: originalname,
      empresaId: usuario.empresaId,
    });

    return { url: result.url };
  }
}
