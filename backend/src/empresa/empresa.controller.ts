// src/empresa/empresa.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
  // Req,
} from '@nestjs/common';
import { EmpresaService } from './empresa.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { SuperadminGuard } from 'src/common/guards/superadmin.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UsuarioRequest } from 'src/types/request-with-usuario';

@UseGuards(SuperadminGuard)
@Roles('superadmin')
@Controller('empresa')
export class EmpresaController {
  constructor(private empresaService: EmpresaService) {}

  @Post('create')
  create(@Body() data: CreateEmpresaDto) {
    console.log('datos recibidos para crear empresa:', data);
    return this.empresaService.create(data);
  }
  @Get('summary')
  obtenerResumen(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return this.empresaService.dataHeader(usuario);
  }

  @Get('all')
  getAll() {
    return this.empresaService.findAll();
  }

  @Get('nit/:nit')
  findByNit(@Param('nit') nit: string) {
    console.log('nit enviado al backend:', nit);
    return this.empresaService.obtenerPorNit(nit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.empresaService.findOne(id);
  }

  @Patch('edit/:id')
  update(@Param('id') id: string, @Body() data: UpdateEmpresaDto) {
    return this.empresaService.update(id, data);
  }

  @Patch('estado-cambiar/:idEmpresa')
  cambiarEstado(@Param('idEmpresa') idEmpresa: string) {
    console.log('llega este id al patch:', idEmpresa);
    return this.empresaService.CambiarEstado(idEmpresa);
  }
}
