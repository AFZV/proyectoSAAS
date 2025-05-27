import { Body, Controller, Post } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';

@Controller('productos')
export class ProductosController {
  constructor(private productosService: ProductosService) {}
  @Post()
  create(@Body() data: CreateProductoDto) {
    return this.productosService.create(data);
  }

  //   @Put(':id')
  //   update(@Param('id') id: string, @Body() data: UpdateProductoDto ) {
  //     return this.pedidosService.update(id, data);
  //   }
}
