import {
  Controller,
  Post,
  Param,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Patch,
} from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { CrearInventarioDto } from './dto/crear-inventario.dto';
import { ActInventarioDto } from './dto/act-inventario-dto';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UsuarioRequest } from 'src/types/request-with-usuario';

@UseGuards(UsuarioGuard, RolesGuard)
@Controller('inventario')
export class InventarioController {
  constructor(private inventarioService: InventarioService) {}
  //Crear el inventario de un producto
  @Roles('admin')
  @Post(':productoId')
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
  @Patch('update/:productoId/:tipomovid')
  async updateinventario(
    @Req() req: UsuarioRequest,
    @Param('productoId') productoId: string,
    @Param('tipomovid') tipomovid: string,
    @Body() dto: ActInventarioDto
  ) {
    const actinvt = await this.inventarioService.updateInventario(
      productoId,
      tipomovid,
      dto.stockActual,
      req.usuario
    );
    return {
      message: `Inventario actualizado para el producto ${productoId}`,
      actinvt,
    };
  }
  //Obtener los productos y su inventario
  @Roles('admin')
  @Get('productosall')
  async getProductos(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    const productos = await this.inventarioService.getProductos(usuario);
    return { productos };
  }

  //Obtener los tipos de movimiento de inventario
  @Roles('admin')
  @Get('tiposmov')
  async getTiposMov() {
    const tiposmov = await this.inventarioService.getTiposMov();
    return { tiposmov };
  }

  //Obtener los movimientos de inventario de un producto
  @Roles('admin')
  @Get('movimientos/:productoId')
  async getMovimientos(
    @Param('productoId') productoId: string,
    @Req() req: UsuarioRequest
  ) {
    const usuario = req.usuario;
    const movimientos = await this.inventarioService.getMovimientosproduc(
      productoId,
      usuario
    );
    return { movimientos };
  }
}
