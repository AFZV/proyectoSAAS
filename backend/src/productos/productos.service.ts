import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/actualizar-producto.dto';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { CreateCategoriaProductoDto } from './dto/create-categoria-producto.dto';
import { PdfUploaderService } from 'src/pdf-uploader/pdf-uploader.service';
@Injectable()
export class ProductosService {
  constructor(
    private prisma: PrismaService,
    private pdfUploaderService: PdfUploaderService
  ) {}

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
  //Obtener los productos con stock de una empresa y activos
  async findAllforEmpresaActiva(usuario: UsuarioPayload) {
    if (!usuario) throw new BadRequestException('no permitido');
    const { empresaId, rol } = usuario;
    try {
      return await this.prisma.producto.findMany({
        where:
          rol === 'admin'
            ? {
                empresaId: empresaId,
                estado: 'activo', // Solo productos activos
              }
            : {
                empresaId: empresaId,
                estado: 'activo', // Solo productos activos
                inventario: {
                  some: {
                    stockActual: {
                      gt: 0, // Solo productos con stock actual mayor a 0
                    },
                  },
                },
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

  /////productos para pdf de catalogo
  async findAllforCatalog(usuario: UsuarioPayload): Promise<Buffer> {
    if (!usuario) throw new BadRequestException('no permitido');
    const { empresaId, rol } = usuario;

    if (rol !== 'admin') {
      throw new UnauthorizedException('usuario no autorizado');
    }

    const productos = await this.prisma.producto.findMany({
      where: {
        empresaId: empresaId,
        estado: 'activo',
        inventario: {
          some: {
            stockActual: { gt: 0 },
          },
        },
      },
      include: {
        inventario: {
          where: { idEmpresa: usuario.empresaId },
          select: {
            stockActual: true,
          },
        },
        categoria: {
          select: {
            nombre: true,
          },
        },
      },
    });
    if (!productos) throw new BadRequestException('no hay productos');

    const productosFormateados = productos.map((p) => ({
      nombre: p.nombre,
      imagenUrl: p.imagenUrl,
      precioVenta: p.precioVenta,
      categoria: p.categoria ?? undefined,
      stockDisponible: p.inventario.reduce(
        (acc, inv) => acc + (inv.stockActual || 0),
        0
      ),
    }));

    const { buffer } =
      await this.pdfUploaderService.generarCatalogoPDF(productosFormateados);

    return buffer;
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

  async createCategoria(
    usuario: UsuarioPayload,
    data: CreateCategoriaProductoDto
  ) {
    try {
      return await this.prisma.categoriasProducto.create({
        data: {
          ...data,
          empresaId: usuario.empresaId,
        },
      });
    } catch (error) {
      console.error('Error al crear la categoría de producto:', error);
      // Si ya es una HttpException (ForbiddenException, etc), re-lánzala
      if (error) {
        throw error;
      }
      // Si no, lanza una InternalServerErrorException
      throw new InternalServerErrorException(
        'Error al crear la categoría de producto'
      );
    }
  }

  async findAllCategoriasforEmpresa(usuario: UsuarioPayload) {
    try {
      return await this.prisma.categoriasProducto.findMany({
        where: { empresaId: usuario.empresaId },
        select: {
          idCategoria: true,
          nombre: true,
        },
      });
    } catch (error) {
      console.error('Error al obtener las categorías de productos:', error);
      // Si ya es una HttpException (ForbiddenException, etc), re-lánzala
      if (error) {
        throw error;
      }
      // Si no, lanza una InternalServerErrorException
      throw new InternalServerErrorException(
        'Error al obtener las categorías de productos'
      );
    }
  }

  //filtrar productos por categoria
  async findByCategoria(usuario: UsuarioPayload, categoriaId: string) {
    try {
      return await this.prisma.producto.findMany({
        where: { categoriaId, empresaId: usuario.empresaId },
        include: {
          inventario: true, // Incluimos el inventario del producto
        },
      });
    } catch (error) {
      console.error('Error al obtener los productos por categoría:', error);
      // Si ya es una HttpException (ForbiddenException, etc), re-lánzala
      if (error) {
        throw error;
      }
      // Si no, lanza una InternalServerErrorException
      throw new InternalServerErrorException(
        'Error al obtener los productos por categoría'
      );
    }
  }
}
