import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
//import { UpdateUsuarioDto } from './dto/update-usuario.dto';
@Controller('usuario')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Post()
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuarioService.create(createUsuarioDto);
  }

  @Get('con-empresa')
  async getUsuarioConEmpresa(@Headers('authorization') userId: string) {
    console.log('📥 Llegó a /usuario/con-empresa'); // 👈 ESTE debe imprimirse SIEMPRE

    if (!userId || typeof userId !== 'string') {
      console.log('⛔ Authorization header faltante o inválido');
      throw new UnauthorizedException('Falta el userId');
    }

    console.log('🔐 Authorization header recibido:', userId);

    const usuario = await this.usuarioService.getUsuarioConEmpresa(userId);
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return usuario;
  }

  @Get('rol')
  getRolUsuario(@Headers('authorization') userId: string) {
    return this.usuarioService.getRolUsuario(userId);
  }

  @Get('por-empresa/:empresaId')
  getUsuariosPorEmpresa(@Param('empresaId') empresaId: string) {
    return this.usuarioService.getUsuariosPorEmpresa(empresaId);
  }

  @Get('existe')
  usuarioExiste(@Query('codigo') codigo: string) {
    return this.usuarioService.usuarioExistePorCodigo(codigo);
  }
}
