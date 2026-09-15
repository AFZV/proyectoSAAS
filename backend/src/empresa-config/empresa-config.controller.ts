// src/empresa-config/empresa-config.controller.ts
import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { EmpresaConfigService } from './empresa-config.service';
import { UpdateEmpresaConfigDto } from './dto/update-empresa-config.dto';

// Configuración de la propia empresa, editable por su admin (no confundir con
// EmpresaController, que es superadmin-only y administra el listado de TODAS las empresas).
@UseGuards(UsuarioGuard, RolesGuard)
@Controller('empresa-config')
export class EmpresaConfigController {
  constructor(private empresaConfigService: EmpresaConfigService) {}

  @Roles('admin')
  @Get()
  obtener(@Req() req: UsuarioRequest) {
    return this.empresaConfigService.obtener(req.usuario);
  }

  @Roles('admin')
  @Put()
  actualizar(@Req() req: UsuarioRequest, @Body() dto: UpdateEmpresaConfigDto) {
    return this.empresaConfigService.actualizar(req.usuario, dto);
  }
}
