import {
  Controller,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { CrearInventarioDto } from './dto/crear-inventario.dto';

@Controller('empresa/:empresaId/producto/:productoId/inventario')
export class InventarioController {
  constructor(private inventarioService: InventarioService) {}
  //Crear el inventario de un producto
  @Post('')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('empresaId') empresaId: string,
    @Param('productoId') productoId: string,
    @Body() dto: CrearInventarioDto,
  ) {
    const registroinv = await this.inventarioService.create(
      empresaId,
      productoId,
      dto.stockActual,
    );
    return {
      message: `Inventario registrado para el producto ${productoId}`,
      registroinv,
    };
  }
}
