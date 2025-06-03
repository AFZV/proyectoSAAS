import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Headers,
  Patch,
} from '@nestjs/common';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';

@Controller('productos')
export class ProductosController {
  constructor(private productosService: ProductosService) {}
  //Crear un producto validando los datos con el DTO
  @Post('create')
  async create(
    @Body() data: CreateProductoDto,
    @Headers('Authorization') userId: string,
  ) {
    //Se crea el producto usando el servicio
    if (!userId) {
      throw new Error('No se ha proporcionado el ID del usuario');
    }
    const producto = await this.productosService.create(userId, data);
    //Se retorna un mensaje de éxito y el producto creado
    return { message: `Se ha creado el producto ${producto.nombre}`, producto };
  }
  //Obtener todos los productos de una empresa
  @Get('empresa/:empresaId')
  async findAll(@Param('empresaId') empresaId: string) {
    const productos = await this.productosService.findAllforEmpresa(empresaId);
    return { productos };
  }

  //Obtener los productos activos de una empresa
  @Get('empresa/:empresaId/activos')
  async findAllActivos(@Param('empresaId') empresaId: string) {
    const productos = await this.productosService.findAllforEmpresa(empresaId);
    //Filtramos los productos activos
    const productosActivos = productos.filter(
      (producto) => producto.estado === 'activo',
    );
    return { productos: productosActivos };
  }
  //Actualizar el Estado de  un producto (Activo/Inactivo) por su ID
  @Patch('update/:productoId')
  async update(
    @Param('productoId') productoId: string,
    @Headers('Authorization') userId: string,
  ) {
    await this.productosService.UpdateProduct(productoId, userId);
    return { message: 'Estado actualizado con exito' };
  }
}
