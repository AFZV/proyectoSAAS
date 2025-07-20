// src/usuario/usuario.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { CreateSuperadminDto } from './dto/create-superadmin.dto';
import { UpdateUsuarioAdminDto } from './dto/update-usuarioadmin.dto';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';

@UseGuards(UsuarioGuard, RolesGuard)
@Controller('usuario')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}
  @Roles('superadmin')
  @Post('admin')
  crearSuperAdmin(
    @Body() data: CreateSuperadminDto,
    @Req() req: UsuarioRequest
  ) {
    return this.usuarioService.createSuperAdmin(data, req.usuario.empresaId);
  }
  @Roles('superadmin')
  @Patch('admin/:id')
  actualizarAdmin(
    @Param('id') id: string,
    @Body() data: UpdateUsuarioAdminDto
  ) {
    return this.usuarioService.actualizarAdmin(id, data);
  }

  @Get('admin')
  obtenerUsuarios() {
    return this.usuarioService.obtenerSuperAdmins();
  }

  @Get('resumen')
  getResumen(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return this.usuarioService.getResumen(usuario);
  }

  //estado actualiza el estado de cualquier usuario
  @Patch('estado/:id')
  cambiarEstadoUsuario(@Param('id') id: string) {
    return this.usuarioService.cambiarEstadoSuperAdmin(id);
  }
  ///crea un usuario y le asigna una empresa
  @Post()
  crearUsuarioEmpresa(@Body() data: CreateUsuarioDto) {
    return this.usuarioService.crearUsuario(data);
  }
  ///actualiza un usuario se hace aparte porque se puede cambiar de empresa
  @Patch('update-id/:id')
  actualizarUsuarioEmpresa(
    @Body() data: UpdateUsuarioDto,
    @Param('id') id: string
  ) {
    return this.usuarioService.actualizarUsuarioEmpresa(data, id);
  }
  //obtener todos los usuarios
  @Get('all')
  getUsuarioConEmpresa(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return this.usuarioService.obtenerTodosUsuarios(usuario);
  }

  @Get('porId/:userId')
  getUsuario(@Param('userId') userId: string) {
    return this.usuarioService.obtenerUsuarioPorId(userId);
  }

  @Get('correo/:correo')
  getByEmail(@Param('correo') correo: string) {
    return this.usuarioService.getByEmail(correo);
  }
  @Roles('admin')
  @Get('usuarios/empresa')
  getUsuariosPorEmpresa(@Req() req: UsuarioRequest) {
    console.log('entrando al controller de usuario');
    const usuario = req.usuario;
    return this.usuarioService.getUsuariosPorEmpresa(usuario);
  }
}
