import {
  Controller,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Put,
  Get,
} from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { CrearInventarioDto } from './dto/crear-inventario.dto';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UsuarioRequest } from 'src/types/request-with-usuario';

@UseGuards(UsuarioGuard, RolesGuard)
@Controller('inventario/:productoId')
export class InventarioController {
  constructor(private inventarioService: InventarioService) {}
  //Crear el inventario de un producto
  @Roles('admin')
  @Post('')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: UsuarioRequest,
    @Param('productoId') productoId: string,
    @Body() dto: CrearInventarioDto,
  ) {
    const usuario = req.usuario;
    const registroinv = await this.inventarioService.create(
      usuario,
      productoId,
      dto.stockReferenciaOinicial,
    );
    return {
      message: `Inventario registrado para el producto ${productoId}`,
      registroinv,
    };
  }


  @Roles('admin')
  @Put('')
  async updateinventario(
    @Param('productoId') productoId: string,
    
  ){

  }
}
