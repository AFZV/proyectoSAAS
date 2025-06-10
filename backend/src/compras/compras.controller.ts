import { Controller, Body, Req, Post, UseGuards } from '@nestjs/common';
import { ComprasService } from './compras.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UsuarioRequest } from 'src/types/request-with-usuario';

@UseGuards(UsuarioGuard, RolesGuard)
@Controller('compras')
export class ComprasController {
  constructor(private comprasService: ComprasService) {}

  //crear una compra de un proveedor
  @Roles('admin')
  @Post('create')
  async create(@Body() data: CreateCompraDto, @Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    const compra = await this.comprasService.create(usuario, data);
    return { message: `Se ha creado la compra ${compra.idCompra}`, compra };
  }
}
