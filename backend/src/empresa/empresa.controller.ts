// src/empresa/empresa.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { EmpresaService } from './empresa.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@Controller('empresa') // Esta es la ruta base: http://localhost:4000/empresa
export class EmpresaController {
  constructor(private empresaService: EmpresaService) {}

  @Get('prueba')
  ejecutarPrueba() {
    return 'esta corriendo el backend';
  }

  @Post()
  create(
    @Body() data: CreateEmpresaDto,
    @Query('userId') userId: string, // El ID del superadmin vendrá por query (o cabecera si prefieres)
  ) {
    return this.empresaService.create(data, userId);
  }

  @Get()
  findAll(@Query('userId') userId: string) {
    return this.empresaService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('userId') userId: string) {
    return this.empresaService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: UpdateEmpresaDto,
    @Query('userId') userId: string,
  ) {
    return this.empresaService.update(id, data, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('userId') userId: string) {
    return this.empresaService.remove(id, userId);
  }
}
