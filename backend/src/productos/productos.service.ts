import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/actualizar-producto.dto';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { CreateCategoriaProductoDto } from './dto/create-categoria-producto.dto';
@Injectable()
export class ProductosService {
  constructor(private prisma: PrismaService) {}

  async create(usuario: UsuarioPayload, data: CreateProductoDto) {
    try {
      return await this.prisma.producto.create({
        data: {
          ...data,
          estado: 'activo', // Por defecto, el producto se crea como activo
          empresaId: usuario.empresaId, // Asignamos la empresa del usuario
          categoriaId: data.categoriaId, // Asignamos la categoría por su ID
        },
      });
    } catch (error: any) {
      console.error('Error al crear el producto:', error);
      // Si ya es una HttpException (ForbiddenException, etc), re-lánzala
      if (error) {
        throw error;
      }
      // Si no, lanza una InternalServerErrorException
      throw new InternalServerErrorException('Error al crear el producto');
    }
  }

  async findAllforEmpresa(usuario: UsuarioPayload) {
    try {
      return await this.prisma.producto.findMany({
        where: {
          empresaId: usuario.empresaId,
        },
        include: {
          //Incluimos el inventario del producto
          inventario: {
            where: { idEmpresa: usuario.empresaId },
            select: {
              stockActual: true,
              stockReferenciaOinicial: true, // Incluimos el stock inicial
            },
          },
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener los productos');
    }
  }

  async UpdateEstadoProduct(productoId: string) {
    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId },
    });

    if (!producto) {
      throw new InternalServerErrorException('Producto no encontrado');
    }

    try {
      // Obtener el estado del producto
      const nuevoEstado = producto.estado === 'activo' ? 'inactivo' : 'activo';

      // Actualizar producto
      await this.prisma.producto.update({
        where: { id: productoId },
        data: { estado: nuevoEstado },
      });
    } catch (error: any) {
      console.error('Error al Actualizar el estado  del producto:', error);
      // Si ya es una HttpException (ForbiddenException, etc), re-lánzala
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.getStatus && typeof error.getStatus === 'function') {
        throw error;
      }
      // Si no, lanza una InternalServerErrorException
      throw new InternalServerErrorException('Error al Actualizar  el estado');
    }
  }

  async UpdateProducto(productoId: string, data: UpdateProductoDto) {
    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId },
    });

    if (!producto) {
      throw new InternalServerErrorException('Producto no encontrado');
    }
    try {
      // Actualizar producto
      return await this.prisma.producto.update({
        where: { id: productoId },
        data: {
          nombre: data.nombre,
          precioCompra: data.precioCompra,
          precioVenta: data.precioVenta,
          categoriaId: data.categoriaId, // Asignamos la categoría por su ID
        },
      });
    } catch (error) {
      console.error('Error al actualizar el producto:', error);
      // Si ya es una HttpException (ForbiddenException, etc), re-lánzala
      if (error) {
        throw error;
      }
      // Si no, lanza una InternalServerErrorException
      throw new InternalServerErrorException('Error al actualizar el producto');
    }
  }

  async createCategoria(data: CreateCategoriaProductoDto) {
    try {
      return await this.prisma.categoriasProducto.create({ data });
    } catch (error) {
      console.error('Error al crear la categoría de producto:', error);
      // Si ya es una HttpException (ForbiddenException, etc), re-lánzala
      if (error) {
        throw error;
      }
      // Si no, lanza una InternalServerErrorException
      throw new InternalServerErrorException(
        'Error al crear la categoría de producto',
      );
    }
  }

  async findAllCategorias(usuario: UsuarioPayload) {
    try {
      //Traemos todas las categorías de productos de la empresa del usuario
      const productos = await this.prisma.producto.findMany({
        where: {
          empresaId: usuario.empresaId,
        },
        select: {
          categoriaId: true, // Seleccionamos solo la categoría
        },
      });

      //Extraemos las categorias unicas
      const idCategorias = [
        ...new Set(
          productos
            .map((p) => p.categoriaId)
            .filter((c): c is string => typeof c === 'string'),
        ),
      ];
      // 3. Buscamos las categorías cuyo id esté en ese array
      const categorias = await this.prisma.categoriasProducto.findMany({
        where: { idCategoria: { in: idCategorias } },
        select: {
          idCategoria: true,
          nombre: true,
        },
      });

      return categorias;
    } catch (error) {
      console.error('Error al obtener las categorías de productos:', error);
      // Si ya es una HttpException (ForbiddenException, etc), re-lánzala
      if (error) {
        throw error;
      }
      // Si no, lanza una InternalServerErrorException
      throw new InternalServerErrorException(
        'Error al obtener las categorías de productos',
      );
    }
  }
}
