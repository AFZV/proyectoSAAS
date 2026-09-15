/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/actualizar-producto.dto';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { CreateCategoriaProductoDto } from './dto/create-categoria-producto.dto';
import { PdfUploaderService } from 'src/pdf-uploader/pdf-uploader.service';
import { formatearTexto } from 'src/lib/formatearTexto';
import { HetznerStorageService } from 'src/hetzner-storage/hetzner-storage.service';
import { promises as fs } from 'fs';
import { GenerarCatalogoPorIdsDto } from './dto/generar-catalogo-por-ids.dto';
import { UpdateCatalogoConfigDto } from './dto/update-catalogo-config.dto';
import { signCatalogShareToken } from 'src/lib/catalogShareToken';
import { signPedidoImportToken } from 'src/lib/pedidoImportToken';
import { format } from 'date-fns';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { emitirAudit } from 'src/auditoria/auditoria.helper';
import { AuditAccion, AuditEntidad } from 'src/auditoria/auditoria.events';

@Injectable()
export class ProductosService {
  constructor(
    private prisma: PrismaService,
    private pdfUploaderService: PdfUploaderService,
    private hetznerService: HetznerStorageService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(usuario: UsuarioPayload, data: CreateProductoDto) {
    const dataCleaned = {
      ...data,
      nombre: data.nombre,
    };
    const { imagenes, ...restoData } = data; // separar imagenes
    try {
      const producto = await this.prisma.producto.create({
        data: {
          ...restoData,
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
      // Crear imágenes si vienen
      if (imagenes && imagenes.length > 0) {
        const slotOrden: Record<string, number> = {
          image1: 1,
          image2: 2,
          image3: 3,
        };

        await Promise.all(
          imagenes.map((img) =>
            this.prisma.productoImagen.create({
              data: {
                productoId: producto.id,
                url: img.url,
                orden: slotOrden[img.slot],
                activo: true,
              },
            })
          )
        );
      }

      emitirAudit(this.eventEmitter, usuario, AuditAccion.CREAR, AuditEntidad.PRODUCTO, producto.id, { nombre: producto.nombre });
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
          imagenes: true,
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
          imagenes: true,
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
    /// ASI SE HACE EL NUEVO CATALOGO
    // const { path } = await this.pdfUploaderService.generarCatalogoNuevoPDF(
    //   productosFormateados
    //   //fileName
    // );

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

  /// CONFIGURACIÓN DE MARCA DEL CATÁLOGO PÚBLICO (logo, colores, banner, etc.)
  async obtenerCatalogoConfig(usuario: UsuarioPayload) {
    if (!usuario) throw new BadRequestException('no permitido');

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: usuario.empresaId },
      select: { logoUrl: true, catalogoConfig: true },
    });
    if (!empresa) throw new BadRequestException('empresa no encontrada');

    return {
      logoUrl: empresa.logoUrl,
      ...((empresa.catalogoConfig as Record<string, unknown>) ?? {}),
    };
  }

  async actualizarCatalogoConfig(
    usuario: UsuarioPayload,
    dto: UpdateCatalogoConfigDto
  ) {
    if (!usuario) throw new BadRequestException('no permitido');
    if (usuario.rol !== 'admin')
      throw new UnauthorizedException('usuario no autorizado');

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: usuario.empresaId },
      select: { catalogoConfig: true },
    });
    if (!empresa) throw new BadRequestException('empresa no encontrada');

    // Merge sobre la config existente. Solo pisamos claves que de verdad vinieron
    // en el DTO (un campo undefined —no tocado por el usuario— nunca borra lo ya guardado).
    const configActual = (empresa.catalogoConfig as Record<string, unknown>) ?? {};
    const configNueva = { ...configActual };
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) configNueva[key] = value;
    }

    const actualizada = await this.prisma.empresa.update({
      where: { id: usuario.empresaId },
      data: { catalogoConfig: configNueva as Prisma.InputJsonValue },
      select: { catalogoConfig: true },
    });

    emitirAudit(
      this.eventEmitter,
      usuario,
      AuditAccion.ACTUALIZAR,
      AuditEntidad.EMPRESA,
      usuario.empresaId,
      { catalogoConfig: configNueva }
    );

    return actualizada.catalogoConfig;
  }

  async subirBannerCatalogo(
    usuario: UsuarioPayload,
    file: Express.Multer.File
  ): Promise<{ url: string; key: string }> {
    if (!usuario) throw new BadRequestException('no permitido');
    if (usuario.rol !== 'admin')
      throw new UnauthorizedException('usuario no autorizado');
    if (!file?.buffer?.length) throw new BadRequestException('archivo inválido');

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: usuario.empresaId },
      select: { catalogoConfig: true },
    });
    const configActual = (empresa?.catalogoConfig as Record<string, unknown>) ?? {};

    // Borra el banner previo si existía (best-effort, no bloquea el flujo)
    const bannerUrlPrevia = configActual.bannerUrl as string | undefined;
    if (bannerUrlPrevia) {
      try {
        const prevKey = this.getKeyFromPublicUrl(
          bannerUrlPrevia,
          this.hetznerService.baseUrl
        );
        if (prevKey) await this.hetznerService.deleteByKey(prevKey);
      } catch (err: any) {
        console.warn('⚠️ No se pudo eliminar el banner previo:', err?.message || err);
      }
    }

    const fileName = this.sanitizarNombreArchivo(file.originalname);
    const folder = `catalogos/${usuario.empresaId}/banner`;
    const url = await this.hetznerService.uploadFile(file.buffer, fileName, folder);
    const key = `${folder}/${fileName}`;

    const configNueva = { ...configActual, bannerUrl: url };
    await this.prisma.empresa.update({
      where: { id: usuario.empresaId },
      data: { catalogoConfig: configNueva },
    });

    emitirAudit(
      this.eventEmitter,
      usuario,
      AuditAccion.SUBIR_ARCHIVO,
      AuditEntidad.EMPRESA,
      usuario.empresaId,
      { bannerUrl: url }
    );

    return { url, key };
  }

  /// Link público (sin login) para compartir el catálogo, válido 48h
  async generarCatalogoCompartirLink(
    usuario: UsuarioPayload
  ): Promise<{ url: string; expiresAt: string }> {
    if (!usuario) throw new BadRequestException('no permitido');
    const rolesPermitidos = ['admin', 'vendedor'];
    if (!rolesPermitidos.includes(usuario.rol)) {
      throw new UnauthorizedException('usuario no autorizado');
    }

    const horas = 48;
    const token = signCatalogShareToken(usuario.empresaId, horas);
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      throw new InternalServerErrorException('FRONTEND_URL no configurado');
    }

    const expiresAt = new Date(
      Date.now() + horas * 3600 * 1000
    ).toISOString();

    emitirAudit(
      this.eventEmitter,
      usuario,
      AuditAccion.CREAR,
      AuditEntidad.EMPRESA,
      usuario.empresaId,
      { accion: 'compartir_catalogo_publico', expiresAt }
    );

    return {
      url: `${frontendUrl}/catalogo-publico/${token}`,
      expiresAt,
    };
  }

  /// Datos del catálogo público (sin usuario autenticado — el llamador ya validó el token/empresaId)
  async obtenerCatalogoPublicoPorEmpresa(empresaId: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        nombreComercial: true,
        logoUrl: true,
        catalogoConfig: true,
        estado: true,
      },
    });
    if (!empresa || empresa.estado !== 'activa') {
      throw new BadRequestException('catálogo no disponible');
    }

    const [productos, categorias] = await Promise.all([
      this.prisma.producto.findMany({
        where: {
          empresaId,
          estado: 'activo',
          inventario: { some: { stockActual: { gt: 0 } } },
        },
        orderBy: { nombre: 'asc' },
        include: {
          inventario: {
            where: { idEmpresa: empresaId },
            select: { stockActual: true },
          },
          categoria: { select: { nombre: true } },
          imagenes: true,
        },
      }),
      this.prisma.categoriasProducto.findMany({
        where: { empresaId },
        select: { idCategoria: true, nombre: true },
      }),
    ]);

    const config = (empresa.catalogoConfig as Record<string, unknown>) ?? {};
    // Por defecto se muestran (solo se ocultan si el admin lo desactivó explícitamente)
    const mostrarPrecio = config.mostrarPrecio !== false;
    const mostrarStock = config.mostrarStock !== false;

    return {
      empresa: {
        nombre: empresa.nombreComercial,
        logoUrl: empresa.logoUrl,
        config,
      },
      categorias,
      // precio/stock se omiten server-side (no solo se ocultan en la UI) cuando el
      // admin desactiva el toggle, para no filtrarlos igual en la respuesta JSON.
      productos: productos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        precio: mostrarPrecio ? (p.precioVenta ?? 0) : null,
        categoria: p.categoria?.nombre ?? 'Sin categoría',
        imagenUrl: p.imagenUrl ?? '',
        stock: mostrarStock
          ? p.inventario.reduce((acc, inv) => acc + (inv.stockActual || 0), 0)
          : null,
        imagenes: p.imagenes ?? [],
      })),
    };
  }

  /// Arma el link firmado que un vendedor/admin usa para importar el carrito armado en el
  /// catálogo público como pedido. Autorizado por el propio token del catálogo (ya validado
  /// por el controller): si alguien pudo ver el catálogo de esta empresa, puede armar este link.
  async generarPedidoImportLink(
    empresaId: string,
    items: { productoId: string; cantidad: number; observacion?: string }[],
    observacionGeneral?: string
  ): Promise<{ url: string }> {
    // Validación mínima: los productos deben existir y ser de esta empresa (evita que el
    // link apunte a ids de otra empresa o inventados).
    const ids = items.map((i) => i.productoId);
    const existentes = await this.prisma.producto.findMany({
      where: { id: { in: ids }, empresaId },
      select: { id: true },
    });
    const idsValidos = new Set(existentes.map((p) => p.id));
    const itemsValidos = items.filter((i) => idsValidos.has(i.productoId));

    if (!itemsValidos.length) {
      throw new BadRequestException('ningún producto del carrito es válido');
    }

    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      throw new InternalServerErrorException('FRONTEND_URL no configurado');
    }

    const token = signPedidoImportToken(
      empresaId,
      itemsValidos,
      observacionGeneral
    );
    // Nota: la pantalla vive en el frontend bajo /invoices (así se llama ahí la sección de
    // Pedidos), aunque la API sea /pedidos — no cambiar sin mover también la carpeta del front.
    return { url: `${frontendUrl}/invoices/importar/${token}` };
  }

  async UpdateEstadoProduct(productoId: string, usuario: UsuarioPayload) {
    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId },
    });

    if (!producto) {
      throw new InternalServerErrorException('Producto no encontrado');
    }

    try {
      const nuevoEstado = producto.estado === 'activo' ? 'inactivo' : 'activo';

      await this.prisma.producto.update({
        where: { id: productoId },
        data: { estado: nuevoEstado },
      });

      emitirAudit(this.eventEmitter, usuario, AuditAccion.CAMBIO_ESTADO, AuditEntidad.PRODUCTO, productoId, { estadoAnterior: producto.estado, nuevoEstado });
    } catch (error: any) {
      console.error('Error al Actualizar el estado  del producto:', error);

      if (error.getStatus && typeof error.getStatus === 'function') {
        throw error;
      }
      throw new InternalServerErrorException('Error al Actualizar  el estado');
    }
  }

  async UpdateProducto(productoId: string, data: UpdateProductoDto, usuario: UsuarioPayload) {
    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId },
    });

    if (!producto) {
      throw new InternalServerErrorException('Producto no encontrado');
    }

    try {
      // 1. Actualizar campos del producto
      const productoActualizado = await this.prisma.producto.update({
        where: { id: productoId },
        data: {
          nombre: data.nombre,
          precioCompra: data.precioCompra,
          precioVenta: data.precioVenta,
          categoriaId: data.categoriaId,
          ...(data.referencia !== undefined && { referencia: data.referencia }),
          ...(data.precioCompraExterior !== undefined && {
            precioCompraExterior: data.precioCompraExterior,
          }),
          ...(data.monedaCompraExterior !== undefined && {
            monedaCompraExterior: data.monedaCompraExterior,
          }),
          ...(data.unidadesPorBulto !== undefined && {
            unidadesPorBulto: data.unidadesPorBulto,
          }),
          ...(data.pesoPorBulto !== undefined && {
            pesoPorBulto: data.pesoPorBulto,
          }),
          ...(data.cubicajePorBulto !== undefined && {
            cubicajePorBulto: data.cubicajePorBulto,
          }),
          ...(data.imagenUrl !== undefined && { imagenUrl: data.imagenUrl }),
        },
      });

      // 2. Upsert de imágenes del carrusel si vienen en el payload
      // data.imagenes = [{ slot: 'image1', url: '...' }, { slot: 'image2', url: '...' }]
      if (data.imagenes && data.imagenes.length > 0) {
        const slotOrden: Record<string, number> = {
          image1: 1,
          image2: 2,
          image3: 3,
        };

        await Promise.all(
          data.imagenes.map((img) =>
            this.prisma.productoImagen.upsert({
              where: {
                // necesitas un unique en el schema: @@unique([productoId, orden])
                productoId_orden: {
                  productoId,
                  orden: slotOrden[img.slot],
                },
              },
              update: { url: img.url, activo: true },
              create: {
                productoId,
                url: img.url,
                orden: slotOrden[img.slot],
                activo: true,
              },
            })
          )
        );
      }

      emitirAudit(this.eventEmitter, usuario, AuditAccion.ACTUALIZAR, AuditEntidad.PRODUCTO, productoId, {
        antes: { precioVenta: producto.precioVenta, precioCompra: producto.precioCompra, nombre: producto.nombre },
        despues: { precioVenta: data.precioVenta, precioCompra: data.precioCompra, nombre: data.nombre },
      });
      return productoActualizado;
    } catch (error) {
      console.error('Error al actualizar el producto:', error);
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException('Error al actualizar el producto');
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

  private sanitizarNombreArchivo(nombre: string): string {
    return nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/#/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_');
  }
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

    const fileName = this.sanitizarNombreArchivo(file.originalname);
    const folder = `empresas/${usuario.empresaId}/manifiestos/${fileName.charAt(0).toUpperCase()}`;
    const key = `${folder}/${fileName}`;
    const urlCalculada = `${this.hetznerService.baseUrl}/${key}`; // 👈 AGREGAR

    const yaExiste = await this.hetznerService.fileExists(key);
    if (yaExiste) {
      if (producto.manifiestoUrl !== urlCalculada) {
        await this.prisma.producto.update({
          where: { id: producto.id },
          data: { manifiestoUrl: urlCalculada },
        });
      }
      return { url: urlCalculada, key };
    }

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
