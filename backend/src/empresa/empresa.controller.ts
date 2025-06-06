// src/empresa/empresa.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  // Req,
} from '@nestjs/common';
import { EmpresaService } from './empresa.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { SuperadminGuard } from 'src/common/guards/superadmin.guard';
//import { UsuarioRequest } from 'src/types/request-with-usuario';
import { Roles } from 'src/common/decorators/roles.decorator';

@UseGuards(SuperadminGuard)
@Roles('superadmin')
@Controller('empresa')
export class EmpresaController {
  constructor(private empresaService: EmpresaService) {}

  @Post('create')
  create(@Body() data: CreateEmpresaDto) {
    return this.empresaService.create(data);
  }

  @Get('all')
  getAll() {
    return this.empresaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.empresaService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateEmpresaDto) {
    return this.empresaService.update(id, data);
  }

  @Patch('estado/:id')
  cambiarEstado(@Param('id') id: string) {
    return this.empresaService.CambiarEstado(id);
  }
}
