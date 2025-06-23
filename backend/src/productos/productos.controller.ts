import {
  Controller,
  Post,
  Body,
  Get,
  Param,
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
import { CreateCategoriaProductoDto } from './dto/create-categoria-producto.dto';

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
  @Roles('admin', 'superadmin')
  @Get('empresa')
  async findAll(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    const productos = await this.productosService.findAllforEmpresa(usuario);
    return { productos };
  }

  //Obtener los productos activos de una empresa
  @Roles('admin', 'vendedor', 'superadmin')
  @Get('empresa/activos')
  async findAllActivos(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    const productos = await this.productosService.findAllforEmpresa(usuario);
    //Filtramos los productos activos
    const productosActivos = productos.filter(
      (producto) => producto.estado === 'activo',
    );
    return { productos: productosActivos };
  }
  //Actualizar el Estado de  un producto (Activo/Inactivo) por su ID
  @Roles('admin')
  @Patch('update/:productoId')
  async update(@Param('productoId') productoId: string) {
    await this.productosService.UpdateEstadoProduct(productoId);
    return { message: 'Estado actualizado con exito' };
  }

  //Actualizar un producto por su ID
  @Roles('admin')
  @Put('update/:productoId')
  async updateall(
    @Param('productoId') productoId: string,
    @Body() data: UpdateProductoDto,
  ) {
    //Se actualiza el producto usando el servicio
    const producto = await this.productosService.UpdateProducto(
      productoId,
      data,
    );
    //Se retorna un mensaje de éxito y el producto actualizado
    return {
      message: `Se ha actualizado el producto ${producto.id}`,
      producto,
    };
  }

  //Crear una categoria de producto
  @Roles('admin')
  @Post('categoria/create')
  async createCategoria(
    @Body() data: CreateCategoriaProductoDto,
    @Req() req: UsuarioRequest,
  ) {
    const usuario = req.usuario;
    const categoria = await this.productosService.createCategoria(
      usuario,
      data,
    );
    return {
      message: `Se ha creado la categoría ${categoria.nombre}`,
      categoria,
    };
  }

  //Obtener todas las categorías de productos de una empresa
  @Roles('admin','superadmin', 'vendedor')
  @Get('categoria/empresa')
  async findAllCategorias(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    const categorias =
      await this.productosService.findAllCategoriasforEmpresa(usuario);
    return { categorias };
  }

  //Obtener productos por categoria
  @Roles('admin', 'superadmin', 'vendedor')
  @Get('categoria/:categoriaId')
  async findByCategoria(
    @Param('categoriaId') categoriaId: string,
    @Req() req: UsuarioRequest,
  ) {
    const usuario = req.usuario;
    const productos = await this.productosService.findByCategoria(
      usuario,
      categoriaId,
    );
    return { productos };
  }
}
