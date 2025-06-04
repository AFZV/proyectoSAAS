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
import { SuperadminGuard } from 'src/common/guards/superadmin.guard';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@UseGuards(SuperadminGuard)
@Controller('usuario')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Post('admin')
  crearSuperAdmin(
    @Body() data: CreateSuperadminDto,
    @Req() req: UsuarioRequest,
  ) {
    return this.usuarioService.createSuperAdmin(data, req.usuario.empresaId);
  }

  @Patch('admin/:id')
  actualizarAdmin(
    @Param('id') id: string,
    @Body() data: UpdateUsuarioAdminDto,
  ) {
    return this.usuarioService.actualizarAdmin(id, data);
  }

  @Get('admin')
  obtenerUsuarios() {
    return this.usuarioService.obtenerSuperAdmins();
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
  @Patch(':id')
  actualizarUsuarioEmpresa(
    @Body() data: UpdateUsuarioDto,
    @Param('id') id: string,
  ) {
    return this.usuarioService.actualizarUsuarioEmpresa(data, id);
  }
  //obtener todos los usuarios
  @Get('all')
  getUsuarioConEmpresa() {
    return this.usuarioService.obtenerTodosUsuarios();
  }

  @Get(':userId')
  getUsuario(@Param('userId') userId: string) {
    return this.usuarioService.obtenerUsuarioPorId(userId);
  }

  @Get('empresa/:empresaId')
  getUsuariosPorEmpresa(@Param('empresaId') empresaId: string) {
    return this.usuarioService.getUsuariosPorEmpresa(empresaId);
  }
}
