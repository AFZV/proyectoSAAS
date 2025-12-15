/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
import { formatearTexto } from 'src/lib/formatearTexto';
import { HetznerStorageService } from 'src/hetzner-storage/hetzner-storage.service';
import { promises as fs } from 'fs';
import { GenerarCatalogoPorIdsDto } from './dto/generar-catalogo-por-ids.dto';
import { format } from 'date-fns';
@Injectable()
export class ProductosService {
  constructor(
    private prisma: PrismaService,
    private pdfUploaderService: PdfUploaderService,
    private hetznerService: HetznerStorageService
  ) {}

  async create(usuario: UsuarioPayload, data: CreateProductoDto) {
    const dataCleaned = {
      ...data,
      nombre: data.nombre,
    };
    try {
      const producto = await this.prisma.producto.create({
        data: {
          ...dataCleaned,
          estado: 'activo', // Por defecto, el producto se crea como activo
          empresaId: usuario.empresaId, // Asignamos la empresa del usuario
          categoriaId: data.categoriaId, // Asignamos la categoría por su ID
        },
      });
      if (producto)
        await this.prisma.inventario.create({
          data: {
            idEmpresa: usuario.empresaId,
            idProducto: producto.id,
          },
        });
      return producto;
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
      const productos = await this.prisma.producto.findMany({
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
      const productosOrdenados = productos.sort((a, b) =>
        a.nombre.localeCompare(b.nombre)
      );
      return productosOrdenados;
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
  slugify(input: string) {
    return input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quita tildes
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // separa por guiones
      .replace(/^-+|-+$/g, '');
  }

  async generarCatalogoLinkPorCategoria(
    usuario: UsuarioPayload,
    categoriaId: string
  ): Promise<{ url: string; key: string }> {
    if (!usuario) throw new BadRequestException('no permitido');
    const rolesPermitidos = ['admin', 'vendedor'];
    if (!rolesPermitidos.includes(usuario.rol)) {
      throw new UnauthorizedException('usuario no autorizado');
    }

    // 1) Verifica que la categoría exista en la empresa
    const categoria = await this.prisma.categoriasProducto.findFirst({
      where: { idCategoria: categoriaId, empresaId: usuario.empresaId },
      select: { idCategoria: true, nombre: true },
    });
    if (!categoria) {
      throw new BadRequestException(
        'categoría no encontrada para esta empresa'
      );
    }

    // 2) Trae productos activos de esa categoría con stock > 0
    const productos = await this.prisma.producto.findMany({
      where: {
        empresaId: usuario.empresaId,
        estado: 'activo',
        categoriaId,
        inventario: { some: { stockActual: { gt: 0 } } },
      },
      orderBy: { nombre: 'asc' },
      include: {
        inventario: {
          where: { idEmpresa: usuario.empresaId },
          select: { stockActual: true },
        },
        categoria: { select: { nombre: true } },
      },
    });

    if (!productos?.length) {
      throw new BadRequestException('no hay productos para esta categoría');
    }

    const productosFormateados = productos.map((p) => ({
      nombre: p.nombre,
      imagenUrl: p.imagenUrl ?? '',
      precioVenta: p.precioVenta ?? 0,
      categoria: p.categoria ?? undefined,
      stockDisponible: p.inventario.reduce(
        (acc, inv) => acc + (inv.stockActual || 0),
        0
      ),
    }));

    // 3) Genera PDF a disco
    const nombreCategoria = this.slugify(categoria.nombre);
    const fileName = `catalogo_${nombreCategoria}.pdf`;

    const { path } = await this.pdfUploaderService.generarCatalogoPDFaDisco(
      productosFormateados,
      fileName
    );

    // 4) Sube al bucket (público) y devuelve link
    const folder = `catalogos/${usuario.empresaId}/${nombreCategoria}`;

    const { url, key } = await this.hetznerService.uploadPublicFromPath(
      path,
      fileName,
      folder
      // Asegúrate que tu upload use ContentDisposition: 'inline'
    );

    // 5) Limpia archivo local
    try {
      await fs.unlink(path);
    } catch {
      /* empty */
    }

    return { url, key };
  }

  /////productos para pdf de catalogo
  async generarCatalogoLink(
    usuario: UsuarioPayload
  ): Promise<{ url: string; key: string }> {
    if (!usuario) throw new BadRequestException('no permitido');
    if (usuario.rol !== 'admin')
      throw new UnauthorizedException('usuario no autorizado');
    // const logoUrl = await prisma?.empresa.findUnique({
    //   where: { id: usuario.empresaId },
    //   select: { logoUrl: true },
    // });

    // // 1) Obtén los productos igual que en findAllforCatalog:
    const empresaId = usuario.empresaId;
    const productos = await this.prisma.producto.findMany({
      where: {
        empresaId: usuario.empresaId,
        estado: 'activo',
        inventario: { some: { stockActual: { gt: 0 } } },
      },
      orderBy: { nombre: 'asc' },
      include: {
        inventario: {
          where: { idEmpresa: usuario.empresaId },
          select: { stockActual: true },
        },
        categoria: { select: { nombre: true } },
      },
    });
    if (!productos?.length) throw new BadRequestException('no hay productos');

    const productosFormateados = productos.map((p) => ({
      nombre: p.nombre,
      imagenUrl: p.imagenUrl ?? '',
      precioVenta: p.precioVenta ?? 0,
      categoria: p.categoria ?? undefined,
      stockDisponible: p.inventario.reduce(
        (acc, inv) => acc + (inv.stockActual || 0),
        0
      ),
    }));

    // 2) Generar PDF a disco (sin buffer en RAM)
    const { path } = await this.pdfUploaderService.generarCatalogoPDFaDisco(
      productosFormateados,
      'catalogo_productos.pdf'
    );

    // 3) Subir a Hetzner (PÚBLICO) y devolver URL
    const folder = `catalogos/${empresaId}`;
    const fileName = `catalogo.pdf`;

    const { url, key } = await this.hetznerService.uploadPublicFromPath(
      path,
      fileName,
      folder
    );

    // 4) Limpia el archivo local
    try {
      await fs.unlink(path);
    } catch {
      /* empty */
    }

    return { url, key };
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
          ...(data.imagenUrl !== undefined && { imagenUrl: data.imagenUrl }), //Para actualizar la imagenUrl solo si se proporciona
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
    const dataCleaned = {
      ...data,
      nombre: formatearTexto(data.nombre),
    };
    try {
      return await this.prisma.categoriasProducto.create({
        data: {
          ...dataCleaned,
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

  /**
   * Sube y asocia un manifiesto (PDF/imagen) a un producto de la empresa del usuario.
   * Recibe el archivo desde el frontend (multipart/form-data, campo "file").
   */
  async subirManifiestoProducto(
    usuario: UsuarioPayload,
    productoId: string,
    file: Express.Multer.File
  ): Promise<{ url: string; key: string }> {
    if (!usuario) throw new BadRequestException('no permitido');
    if (usuario.rol !== 'admin') {
      throw new UnauthorizedException('usuario no autorizado');
    }

    // 1) Traer producto + URL previa del manifiesto (si existe)
    const producto = await this.prisma.producto.findFirst({
      where: { id: productoId, empresaId: usuario.empresaId },
      select: { id: true, nombre: true, manifiestoUrl: true }, // 👈 usamos solo la URL
    });
    if (!producto) throw new BadRequestException('producto no encontrado');

    if (!file?.buffer?.length) {
      throw new BadRequestException('archivo inválido');
    }

    // 2) Si hay un manifiesto previo, derivamos el "key" desde la URL y lo borramos
    if (producto.manifiestoUrl) {
      try {
        const prevKey = this.getKeyFromPublicUrl(
          producto.manifiestoUrl,
          this.hetznerService.baseUrl
        );
        if (prevKey) {
          await this.hetznerService.deleteByKey(prevKey);
        }
      } catch (err: any) {
        // No bloquear el flujo por falla al borrar
        console.warn(
          '⚠️ No se pudo eliminar el manifiesto previo:',
          err?.message || err
        );
      }
    }

    // 3) Preparar nombre/carpeta para el NUEVO PDF
    const slug = this.slugify(producto.nombre || 'producto');
    const ext = file.originalname.includes('.')
      ? file.originalname.substring(file.originalname.lastIndexOf('.'))
      : '.pdf';
    const fileName = `manifiesto_${slug}_${Date.now()}${ext}`;
    const folder = `empresas/${usuario.empresaId}/productos/manifiestos/${producto.id}`;
    const key = `${folder}/${fileName}`;

    // 4) Subir (tu uploadFile devuelve SOLO la URL pública)
    const url = await this.hetznerService.uploadFile(
      file.buffer,
      fileName,
      folder
    );

    // 5) Guardar nueva URL (no guardamos key porque no existe en el modelo)
    await this.prisma.producto.update({
      where: { id: producto.id },
      data: { manifiestoUrl: url },
    });

    return { url, key };
  }

  /**
   * Deriva el "key" (ruta dentro del bucket) a partir de una URL pública.
   * Ej: baseUrl = https://files.mi-bucket.com
   *     url     = https://files.mi-bucket.com/empresas/123/productos/456/manifiestos/arch.pdf
   *     -> key  = empresas/123/productos/456/manifiestos/arch.pdf
   */
  private getKeyFromPublicUrl(
    publicUrl: string,
    baseUrl: string
  ): string | null {
    try {
      // Normaliza: sin slash final en baseUrl
      const base = baseUrl.replace(/\/+$/, '');
      const u = new URL(publicUrl);
      // Caso 1: misma base (dominio/host) -> usamos pathname
      if (u.origin === base) {
        return u.pathname.replace(/^\/+/, ''); // quita el leading slash
      }
      // Caso 2: publicUrl comienza con baseUrl como string (por si hay CDN/path)
      if (publicUrl.startsWith(base + '/')) {
        return publicUrl.slice((base + '/').length);
      }
      // Fallback: intenta tomar lo que venga después del host
      return u.pathname.replace(/^\/+/, '') || null;
    } catch {
      // Si no es URL válida, intenta heurística simple
      const idx = publicUrl.indexOf(baseUrl);
      if (idx >= 0) {
        return (
          publicUrl.slice(idx + baseUrl.length).replace(/^\/+/, '') || null
        );
      }
      return null;
    }
  }

  async generarCatalogoLinkPorIdsPDF(
    usuario: UsuarioPayload,
    dto: GenerarCatalogoPorIdsDto
  ): Promise<{ url: string; key: string; count: number }> {
    if (!usuario) throw new BadRequestException('no permitido');
    const rolesPermitidos = ['admin', 'vendedor'];
    if (!rolesPermitidos.includes(usuario.rol)) {
      throw new UnauthorizedException('usuario no autorizado');
    }

    const { productoIds } = dto;
    if (!productoIds?.length)
      throw new BadRequestException('productoIds vacío');

    // 1) Traer productos de la empresa, activos y con stock > 0
    const productos = await this.prisma.producto.findMany({
      where: {
        empresaId: usuario.empresaId,
        id: { in: productoIds },
        estado: 'activo',
        inventario: { some: { stockActual: { gt: 0 } } }, // ← SOLO con stock
      },
      include: {
        inventario: {
          where: { idEmpresa: usuario.empresaId },
          select: { stockActual: true },
        },
        categoria: { select: { nombre: true } },
      },
    });

    if (!productos?.length) {
      throw new BadRequestException(
        'no hay productos con stock para generar el catálogo'
      );
    }

    // 2) Mantener el orden solicitado y recalcular stock por seguridad
    const order: Record<string, number> = {};
    productoIds.forEach((id, idx) => (order[id] = idx));

    const productosConStock = productos
      .map((p) => ({
        ...p,
        stockDisponible: p.inventario.reduce(
          (acc, inv) => acc + (inv.stockActual || 0),
          0
        ),
      }))
      .filter((p) => p.stockDisponible > 0)
      .sort((a, b) => (order[a.id] ?? 99999) - (order[b.id] ?? 99999));

    if (!productosConStock.length) {
      throw new BadRequestException(
        'ninguno de los productos seleccionados tiene stock'
      );
    }

    // 3) Adaptar al formato de tu plantilla EJS
    const productosFormateados = productosConStock.map((p) => ({
      nombre: p.nombre,
      imagenUrl: p.imagenUrl ?? '',
      precioVenta: p.precioVenta ?? 0,
      categoria: p.categoria ?? undefined,
      stockDisponible: p.stockDisponible,
    }));

    // 4) Generar PDF a disco
    const fecha = format(new Date(), 'yyyyMMdd_HHmm');
    const fileName = `catalogo_seleccionado_${fecha}.pdf`;

    const { path } = await this.pdfUploaderService.generarCatalogoPDFaDisco(
      productosFormateados,
      fileName
    );

    // 5) Subir a Hetzner (forzar descarga)
    const folder = `catalogos/${usuario.empresaId}/por-ids`;
    const { url, key } = await this.hetznerService.uploadPublicFromPath(
      path,
      fileName,
      folder
      // si tu método acepta opts; si no, cambia ContentDisposition en el service de Hetzner
    );

    // 6) Limpiar archivo temporal
    try {
      await fs.unlink(path);
    } catch {
      /* noop */
    }

    return { url, key, count: productosConStock.length };
  }
}
