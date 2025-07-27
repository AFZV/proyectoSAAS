import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { createProveedorDto } from './dto/create-proveedor.dto';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
@UseGuards(UsuarioGuard, RolesGuard)
@Roles('admin')
@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  //crea un proveedor solo los usuarios logueados como admin pueden acceder
  @Post()
  crearProveedor(@Body() data: createProveedorDto, @Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return this.proveedoresService.crearProveedor(data, usuario);
  }

  ///
  @Get('all')
  obtenerProveedoresPorEmpresa(@Req() req: UsuarioRequest) {
    const empresaId = req.usuario.empresaId;
    if (!empresaId)
      throw new BadRequestException('no es posible esta peticion');
    return this.proveedoresService.obtenerProveedores(empresaId);
  }
  @Get('summary')
  getResume(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return this.proveedoresService.getResumen(usuario);
  }
  @Get('getbyid/:proveedorId')
  getById(
    @Param('proveedorId') proveedorId: string,
    @Req() req: UsuarioRequest
  ) {
    const usuario = req.usuario;
    return this.proveedoresService.getProveedorById(usuario, proveedorId);
  }

  @Patch(':proveedorId')
  actualizarProveedor(
    @Param('proveedorId') proveedorId: string,
    @Body() data: UpdateProveedorDto,
    @Req() req: UsuarioRequest
  ) {
    return this.proveedoresService.actualizarProveedorId(
      proveedorId,
      data,
      req.usuario
    );
  }
}
