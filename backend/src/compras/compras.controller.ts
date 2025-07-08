import {
  Controller,
  Body,
  Req,
  Post,
  UseGuards,
  Put,
  Param,
  Get,
} from '@nestjs/common';
import { ComprasService } from './compras.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { UpdateCompraDto } from './dto/update-compra.dto';

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
  //Actualizar una compra por su ID
  @Roles('admin')
  @Put('update/:idCompra')
  async update(
    @Param('idCompra') idCompra: string,
    @Body() data: UpdateCompraDto,
    @Req() req: UsuarioRequest
  ) {
    const usuario = req.usuario;
    const compraActualizada = await this.comprasService.updateCompra(
      idCompra,
      usuario,
      data
    );
    return {
      message: `Se ha actualizado la compra ${idCompra}`,
      compraActualizada,
    };
  }

  //Obtener todas las compras de una empresa
  @Roles('admin')
  @Get('findAll/empresa')
  async findAll(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    const compras = await this.comprasService.findAll(usuario);
    return { compras };
  }

  //Obtener una compra por su ID
  @Roles('admin')
  @Get('find/:idCompra')
  async findById(
    @Param('idCompra') idCompra: string,
    @Req() req: UsuarioRequest
  ) {
    const usuario = req.usuario;
    const compra = await this.comprasService.findById(idCompra, usuario);
    return { compra };
  }
}
