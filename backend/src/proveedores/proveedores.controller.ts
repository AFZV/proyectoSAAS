import { Controller, Post, UseGuards } from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
@UseGuards(UsuarioGuard, RolesGuard)
@Roles('admin')
@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Post()
  crearProveedor() {
    return this.proveedoresService.crearProveedor();
  }
}
