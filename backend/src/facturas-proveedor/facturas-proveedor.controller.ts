import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UnauthorizedException,
  Req,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { FacturasProveedorService } from './facturas-proveedor.service';
import { CreateFacturasProveedorDto } from './dto/create-facturas-proveedor.dto';
import { UpdateFacturasProveedorDto } from './dto/update-facturas-proveedor.dto';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
@UseGuards(UsuarioGuard, RolesGuard)
@Roles('admin')
@Controller('facturas-proveedor')
export class FacturasProveedorController {
  constructor(
    private readonly facturasProveedorService: FacturasProveedorService
  ) {}

  @Post('create')
  create(
    @Body() createFacturasProveedorDto: CreateFacturasProveedorDto,
    @Req() req: UsuarioRequest
  ) {
    const usuario = req.usuario;
    if (!usuario) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.facturasProveedorService.create(
      createFacturasProveedorDto,
      usuario.empresaId
    );
  }

  @Get()
  findAll(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return this.facturasProveedorService.findAll(usuario);
  }

  @Get(':proveedorId')
  fingByProveedor(
    @Param('proveedorId') proveedorId: string,
    @Req() req: UsuarioRequest
  ) {
    const usuario = req.usuario;
    if (!usuario) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.facturasProveedorService.findByProveedor(proveedorId, usuario);
  }
  @Get('findOne/:id')
  findOne(@Param('id') id: string, @Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    if (!usuario) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.facturasProveedorService.findOne(id, usuario);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFacturasProveedorDto: UpdateFacturasProveedorDto,
    @Req() req: UsuarioRequest
  ) {
    const usuario = req.usuario;
    if (!usuario) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.facturasProveedorService.update(
      id,
      updateFacturasProveedorDto,
      usuario
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    if (!usuario) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.facturasProveedorService.remove(id, usuario);
  }
}
