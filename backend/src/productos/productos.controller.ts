import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Headers,
  Patch,
  Put,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/actualizar-producto.dto';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UsuarioRequest } from 'src/types/request-with-usuario';

@UseGuards(UsuarioGuard, RolesGuard)
@Controller('productos')
export class ProductosController {
  constructor(private productosService: ProductosService) {}
  //Crear un producto validando los datos con el DTO
  @Roles('admin')
  @Post('create')
  async create(
    @Body() data: CreateProductoDto,
    @Req() req: UsuarioRequest,
    //@
  ) {
    const usuario = req.usuario;
    //Se crea el producto usando el servicio
    const producto = await this.productosService.create(usuario, data);
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
    await this.productosService.UpdateEstadoProduct(productoId, userId);
    return { message: 'Estado actualizado con exito' };
  }

  //Actualizar un producto por su ID
  @Put('update/:productoId')
  async updateall(
    @Param('productoId') productoId: string,
    @Body() data: UpdateProductoDto,
    @Headers('Authorization') userId: string,

  ) {
    //Se actualiza el producto usando el servicio
    const producto = await this.productosService.UpdateProducto(
      productoId,
      userId,
      data,
    );
    //Se retorna un mensaje de éxito y el producto actualizado
    return { message: `Se ha actualizado el producto ${producto.id}`, producto };
  }
}
