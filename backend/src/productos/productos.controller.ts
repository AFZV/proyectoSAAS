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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
} from '@nestjs/common';

import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/actualizar-producto.dto';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { CreateCategoriaProductoDto } from './dto/create-categoria-producto.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';

@UseGuards(UsuarioGuard, RolesGuard)
@Controller('productos')
export class ProductosController {
  constructor(private productosService: ProductosService) { }
  //Crear un producto validando los datos con el DTO
  @Roles('admin')
  @Post('create')
  async create(
    @Body() data: CreateProductoDto,
    @Req() req: UsuarioRequest
    //@
  ) {
    const usuario = req.usuario;
    //Se crea el producto usando el servicio
    const producto = await this.productosService.create(usuario, data);
    //Se retorna un mensaje de éxito y el producto creado
    return { message: `Se ha creado el producto ${producto.nombre}`, producto };
  }
  //Obtener todos los productos de una empresa
  @Roles('admin', 'superadmin', 'bodega')
  @Get('empresa')
  async findAll(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    const productos = await this.productosService.findAllforEmpresa(usuario);

    return { productos };
  }

  //Obtener los productos con stock de una empresa
  @Roles('admin', 'vendedor', 'superadmin', 'temporal', 'bodega', 'CLIENTE')
  @Get('empresa/activos')
  async findAllActivos(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    const productos =
      await this.productosService.findAllforEmpresaActiva(usuario);

    return { productos };
  }
  //Actualizar el Estado de  un producto (Activo/Inactivo) por su ID
  @Roles('admin')
  @Patch('update/:productoId')
  async update(
    @Param('productoId') productoId: string
    // @Body() data: UpdateProductoDto
  ) {
    await this.productosService.UpdateEstadoProduct(productoId);
    return { message: 'Estado actualizado con exito' };
  }

  //Actualizar un producto por su ID
  @Roles('admin')
  @Put('update/:productoId')
  async updateall(
    @Param('productoId') productoId: string,
    @Body() data: UpdateProductoDto
  ) {
    //Se actualiza el producto usando el servicio
    const producto = await this.productosService.UpdateProducto(
      productoId,
      data
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
    @Req() req: UsuarioRequest
  ) {
    const usuario = req.usuario;
    const categoria = await this.productosService.createCategoria(
      usuario,
      data
    );
    return {
      message: `Se ha creado la categoría ${categoria.nombre}`,
      categoria,
    };
  }

  //Obtener todas las categorías de productos de una empresa
  @Roles('admin', 'superadmin', 'vendedor', 'temporal', 'bodega', 'CLIENTE')
  @Get('categoria/empresa')
  async findAllCategorias(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    const categorias =
      await this.productosService.findAllCategoriasforEmpresa(usuario);
    return { categorias };
  }

  //Obtener productos por categoria
  @Roles('admin', 'superadmin', 'vendedor', 'temporal', 'bodega')
  @Get('categoria/:categoriaId')
  async findByCategoria(
    @Param('categoriaId') categoriaId: string,
    @Req() req: UsuarioRequest
  ) {
    const usuario = req.usuario;
    const productos = await this.productosService.findByCategoria(
      usuario,
      categoriaId
    );
    return { productos };
  }

  @Roles('admin')
  @Get('catalogo/link')
  async catalogoLink(@Req() req: UsuarioRequest) {
    const { url } = await this.productosService.generarCatalogoLink(
      req.usuario
    );
    return { url }; // { url: 'https://...' }
  }
  // productos.controller.ts
  @Roles('admin')
  @Get('catalogo/link/categoria/:categoriaId')
  async catalogoLinkPorCategoria(
    @Req() req: UsuarioRequest,
    @Param('categoriaId') categoriaId: string
  ) {
    const { url, key } =
      await this.productosService.generarCatalogoLinkPorCategoria(
        req.usuario,
        categoriaId
      );
    return { url, key };
  }

  /**
   * Sube el manifiesto de un producto (PDF o imagen).
   * Espera un multipart/form-data con campo "file".
   */
  @Roles('admin')
  @Post(':productoId/manifiesto')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(), // <-- ¡importante para tener file.buffer!
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
      },
    })
  )
  async subirManifiestoProducto(
    @Req() req: UsuarioRequest,
    @Param('productoId') productoId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({
            // Acepta PDF e imágenes comunes
            fileType: /^(application\/pdf|image\/(png|jpeg|jpg|webp))$/,
          }),
        ],
      })
    )
    file: Express.Multer.File
  ) {
    const usuario = req.usuario; // tu guard debe inyectar UsuarioPayload aquí
    if (!usuario) throw new BadRequestException('no permitido');

    // Llama al service (versión que adapta a tu uploadFile(buffer, fileName, folder))
    return this.productosService.subirManifiestoProducto(
      usuario,
      productoId,
      file
    );
  }

  // 2) Redirección 302 al enlace (descarga directa desde el bucket)
  // @Roles('admin')
  // @Get('catalogo/link-redirect')
  // async catalogoLinkRedirect(@Res() res: Response, @Req() req: UsuarioRequest) {
  //   const { url } = await this.productosService.generarCatalogoLink(
  //     req.usuario
  //   );

  //   res.setHeader('Cache-Control', 'no-store');
  //   return res.redirect(url);
  // }
}
