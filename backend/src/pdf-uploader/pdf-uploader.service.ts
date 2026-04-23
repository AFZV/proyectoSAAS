import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { compile, TemplateFunction } from 'ejs';
import { launch, Browser, Page } from 'puppeteer';
import * as os from 'os';
import { PDFDocument } from 'pdf-lib';
import axios, { AxiosResponse } from 'axios';
import { ResumenPedidoDto } from './dto/resumen-pedido.dto';
import { ResumenReciboDto } from './dto/resumen-recibo.dto';
import { ResumenCompraDto } from 'src/compras/dto/resumen-compra.dto';
import * as sharp from 'sharp';

type CatalogoProducto = {
  nombre: string;
  imagenUrl: string;
  precioVenta: number;
  categoria?: { nombre: string };
  stockDisponible: number;
};

type TemplateData =
  | ResumenPedidoDto
  | ResumenReciboDto
  | ResumenCompraDto
  | { productos: CatalogoProducto[] };

@Injectable()
export class PdfUploaderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PdfUploaderService.name);
  private browser: Browser | null = null;

  private templates: Record<
    'pedido' | 'recibo' | 'catalogo' | 'compra' | 'catalogoNuevo',
    TemplateFunction | null
  > = {
    pedido: null,
    recibo: null,
    catalogo: null,
    compra: null,
    catalogoNuevo: null,
  };

  private readonly templatePaths = {
    pedido: join(process.cwd(), 'src', 'templates', 'pedido.ejs'),
    recibo: join(process.cwd(), 'src', 'templates', 'recibo.ejs'),
    catalogo: join(process.cwd(), 'src', 'templates', 'catalogo.ejs'),
    compra: join(process.cwd(), 'src', 'templates', 'compra.ejs'),
    catalogoNuevo: join(process.cwd(), 'src', 'templates', 'catalogoNuevo.ejs'),
  };
  private async optimizarImagenesCatalogo(
    productos: CatalogoProducto[]
  ): Promise<CatalogoProducto[]> {
    // Tamaño del lote (ajustable). 20–30 va bien para empezar.
    const CHUNK_SIZE = 20;
    const optimizados: CatalogoProducto[] = [];

    for (let i = 0; i < productos.length; i += CHUNK_SIZE) {
      const slice = productos.slice(i, i + CHUNK_SIZE);

      const procesados = await Promise.all(
        slice.map(async (p) => {
          if (!p.imagenUrl || p.imagenUrl.startsWith('data:')) {
            return p;
          }

          try {
            const resp = await axios.get<ArrayBuffer>(p.imagenUrl, {
              responseType: 'arraybuffer',
              timeout: 10_000, // ⬅️ más corto, si no carga rápido, seguimos
            });

            // ⬇️ Redimensionamos y bajamos calidad para catálogos
            const jpegBuffer = await sharp(Buffer.from(resp.data))
              .resize({
                width: 800, // ancho máximo (no agranda si es menor)
                withoutEnlargement: true,
              })
              .jpeg({ quality: 70 }) // calidad agresiva pero se ve bien en PDF
              .toBuffer();

            const dataUrl = `data:image/jpeg;base64,${jpegBuffer.toString(
              'base64'
            )}`;

            return {
              ...p,
              imagenUrl: dataUrl,
            };
          } catch (err) {
            this.logger.warn(
              `⚠️ No se pudo optimizar imagen de "${p.nombre}": ${
                (err as Error).message
              }`
            );
            // Si falla, devolvemos el producto con la URL original
            return p;
          }
        })
      );

      optimizados.push(...procesados);
    }

    return optimizados;
  }

  async onModuleInit(): Promise<void> {
    await Promise.all([this.initializeBrowser(), this.compileTemplates()]);
    this.logger.log('📄 PDF service initialized');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.logger.log('🧹 Browser instance closed');
    }
  }

  private async compileTemplates(): Promise<void> {
    try {
      await Promise.all(
        Object.values(this.templatePaths).map((path) => fs.access(path))
      );

      const [
        pedidoHtml,
        reciboHtml,
        catalogoHtml,
        compraHtml,
        catalogoNuevoHtml,
      ] = await Promise.all([
        fs.readFile(this.templatePaths.pedido, 'utf8'),
        fs.readFile(this.templatePaths.recibo, 'utf8'),
        fs.readFile(this.templatePaths.catalogo, 'utf8'),
        fs.readFile(this.templatePaths.compra, 'utf8'),
        fs.readFile(this.templatePaths.catalogoNuevo, 'utf8'),
      ]);

      this.templates.pedido = compile(pedidoHtml);
      this.templates.recibo = compile(reciboHtml);
      this.templates.catalogo = compile(catalogoHtml);
      this.templates.compra = compile(compraHtml);
      this.templates.catalogoNuevo = compile(catalogoNuevoHtml);

      this.logger.log('✅ Templates compiled successfully');
    } catch (error) {
      this.logger.error('❌ Error compiling templates', error);
      throw error;
    }
  }

  async generarPedidoPDF(
    data: ResumenPedidoDto
  ): Promise<{ buffer: Buffer; path: string }> {
    return this.generarPDF({
      data,
      fileName: `pedido_${data.id}.pdf`,
      tipo: 'pedido',
    });
  }

  async generarReciboPDF(
    data: ResumenReciboDto
  ): Promise<{ buffer: Buffer; path: string }> {
    return this.generarPDF({
      data,
      fileName: `recibo_${data.id}.pdf`,
      tipo: 'recibo',
    });
  }

  async generarCatalogoPDF(
    productos: CatalogoProducto[]
  ): Promise<{ buffer: Buffer; path: string }> {
    const productosOptim = await this.optimizarImagenesCatalogo(productos);

    return this.generarPDF({
      data: { productos: productosOptim },
      fileName: `catalogo_productos.pdf`,
      tipo: 'catalogo',
    });
  }

  private async generarPDF({
    data,
    fileName,
    tipo,
  }: {
    data: TemplateData;
    fileName: string;
    tipo: 'pedido' | 'recibo' | 'catalogo' | 'compra' | 'catalogoNuevo';
  }): Promise<{ buffer: Buffer; path: string }> {
    try {
      const html = this.renderTemplate(tipo, data);
      const page = await this.createPage();

      try {
        await this.loadContent(page, html);

        const buffer = await this.generatePdfBuffer(page, tipo);

        const filePath = join(os.tmpdir(), fileName);

        await fs.writeFile(filePath, buffer);
        this.logger.log(`📄 PDF generado: ${filePath}`);

        return { buffer, path: filePath };
      } finally {
        await page.close();
      }
    } catch (error) {
      this.logger.error(`❌ Error generando PDF`, error);
      throw new Error(
        `Fallo al generar PDF: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async loadContent(page: Page, html: string): Promise<void> {
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000, // ⬅️ sube de 10s a 120s
    });

    // Esperar que cargue al menos una imagen
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          });
        })
      );
    });
  }
  async generarCatalogoNuevoPDF(
    productos: CatalogoProducto[]
  ): Promise<{ buffer: Buffer; path: string }> {
    const productosOptim = await this.optimizarImagenesCatalogo(productos);

    return this.generarPDF({
      data: { productos: productosOptim },
      fileName: `catalogo_revista.pdf`,
      tipo: 'catalogoNuevo',
    });
  }

  private renderTemplate(
    tipo: 'pedido' | 'recibo' | 'catalogo' | 'compra' | 'catalogoNuevo',
    data: TemplateData
  ): string {
    const template = this.templates[tipo];
    if (!template) {
      throw new Error(`Plantilla no compilada para tipo: ${tipo}`);
    }

    return template(data as unknown as Record<string, unknown>);
  }

  // private async initializeBrowser(): Promise<void> {
  //   try {
  //     this.browser = await launch({
  //       headless: true,
  //       args: [
  //         '--no-sandbox',
  //         '--disable-setuid-sandbox',
  //         '--disable-dev-shm-usage',
  //         '--disable-gpu',
  //         '--disable-extensions',
  //         '--no-first-run',
  //         '--disable-default-apps',
  //       ],
  //     });
  //     this.logger.log('🧭 Browser initialized');
  //   } catch (error) {
  //     this.logger.error('❌ Error launching browser', error);
  //     throw error;
  //   }
  // }
  private async initializeBrowser(): Promise<void> {
    try {
      this.logger.log('🧭 Lanzando browser...');
      this.browser = await launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions',
          '--no-first-run',
          '--disable-default-apps',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      });

      // 🔥 Cuando Chromium se caiga, marcamos browser=null
      this.browser.on('disconnected', () => {
        this.logger.warn('⚠️ Browser desconectado — se marcará como null.');
        this.browser = null;
      });

      this.logger.log('🧭 Browser inicializado OK');
    } catch (error) {
      this.logger.error('❌ Error launching browser', error);
      throw error;
    }
  }

  // private async createPage(): Promise<Page> {
  //   if (!this.browser) throw new Error('Browser no inicializado');
  //   const page = await this.browser.newPage();

  //   // Aumenta timeouts por defecto del Page
  //   page.setDefaultTimeout(180_000); // 3 min (interacciones)
  //   page.setDefaultNavigationTimeout(180_000); // 3 min (navegación)

  //   await page.setViewport({ width: 794, height: 1123 }); // A4
  //   await page.emulateMediaType('screen'); // por si tu CSS difiere
  //   return page;
  // }
  private async createPage(): Promise<Page> {
    try {
      if (!this.browser) {
        await this.initializeBrowser();
      }

      try {
        const page = await this.browser!.newPage();
        page.setDefaultTimeout(180_000);
        page.setDefaultNavigationTimeout(180_000);
        await page.setViewport({ width: 794, height: 1123 });
        await page.emulateMediaType('screen');
        return page;
      } catch (err: any) {
        const msg = err?.message || '';

        // 🧨 Si el browser está muerto → lo relanzamos
        if (
          msg.includes('Connection closed') ||
          msg.includes('Browser has been closed') ||
          msg.includes('Target closed')
        ) {
          this.logger.warn(`⚠️ Browser muerto ("${msg}") → relanzando...`);
          await this.initializeBrowser();
          const page = await this.browser!.newPage();
          page.setDefaultTimeout(180_000);
          page.setDefaultNavigationTimeout(180_000);
          await page.setViewport({ width: 794, height: 1123 });
          await page.emulateMediaType('screen');
          return page;
        }

        throw err;
      }
    } catch (err) {
      this.logger.error(`❌ createPage fatal: ${err}`);
      throw err;
    }
  }

  private async generatePdfBuffer(
    page: Page,
    tipo: 'pedido' | 'recibo' | 'catalogo' | 'compra' | 'catalogoNuevo'
  ): Promise<Buffer> {
    try {
      await page.waitForNetworkIdle({ idleTime: 1200, timeout: 90_000 });
    } catch {}

    const pdfOptions =
      tipo === 'catalogoNuevo'
        ? {
            printBackground: true,
            preferCSSPageSize: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
            timeout: 180_000,
          }
        : {
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: {
              top: '10mm',
              right: '10mm',
              bottom: '10mm',
              left: '10mm',
            },
            timeout: 180_000,
          };

    const buffer = await page.pdf(pdfOptions as any);
    return Buffer.from(buffer);
  }

  public healthCheck(): boolean {
    return Boolean(
      this.browser &&
        this.browser.isConnected() &&
        this.templates.pedido &&
        this.templates.recibo &&
        this.templates.catalogo &&
        this.templates.compra &&
        this.templates.catalogoNuevo
    );
  }

  public async reinitializeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
    await this.initializeBrowser();
  }
  async generarCatalogoPDFaDisco(
    productos: CatalogoProducto[],
    fileName = 'catalogo_productos.pdf'
  ): Promise<{ path: string }> {
    const productosOptim = await this.optimizarImagenesCatalogo(productos);
    const html = this.renderTemplate('catalogo', { productos: productosOptim });

    const page = await this.createPage();
    try {
      await this.loadContent(page, html);
      const filePath = join(os.tmpdir(), fileName);

      // 👇 escribe directo a disco (no crea Buffer gigante en RAM)
      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        timeout: 180_000,
      });

      this.logger.log(`📄 PDF generado: ${filePath}`);
      return { path: filePath };
    } finally {
      await page.close();
    }
  }
  async generarCompraPDF(
    data: ResumenCompraDto
  ): Promise<{ buffer: Buffer; path: string }> {
    return this.generarPDF({
      data,
      fileName: `compra_${data.idCompra}.pdf`,
      tipo: 'compra',
    });
  }

  /**
   * Descarga y combina múltiples PDFs (urls absolutas) y devuelve { buffer, path, count, fallidos }.
   * - NO sube a bucket. Solo descarga directa (como tus otros métodos).
   * - Es la versión genérica: ideal para "separar responsabilidades".
   */
  /**
   * Fusiona múltiples PDFs desde URLs usando Puppeteer
   * Reutiliza la instancia de browser existente para mejor performance
   */
  /**
   * Fusiona múltiples PDFs descargándolos y combinándolos a nivel de páginas (sin headless/Chromium).
   * Devuelve { buffer, path, count, fallidos }.
   */
  async fusionarPdfsDesdeUrls(
    urls: string[],
    fileName = 'manifiestos_fusionados.pdf'
  ): Promise<{
    buffer: Buffer;
    path: string;
    count: number;
    fallidos: string[];
  }> {
    if (!Array.isArray(urls) || urls.length === 0) {
      throw new Error('No se recibieron URLs para fusionar');
    }

    const fallidos: string[] = [];
    const buffersValidos: Buffer[] = [];

    // 1) Descarga todos los PDFs como Buffer (con manejo de errores por URL)
    const CONCURRENCIA = 6; // 🔥 prueba 4 primero si quieres seguro

    const results: { ok: boolean; buf?: Buffer; url: string }[] = [];
    let index = 0;

    const workers = new Array(CONCURRENCIA).fill(0).map(async () => {
      while (index < urls.length) {
        const currentIndex = index++;
        const url = urls[currentIndex];

        try {
          const buf = await this.descargarPdfComoBuffer(url);
          this.logger.log(`📥 PDF descargado ok (${buf.length} bytes): ${url}`);
          results[currentIndex] = { ok: true, buf, url };
        } catch (err) {
          this.logger.warn(`⚠️ No se pudo descargar PDF: ${url}`);
          results[currentIndex] = { ok: false, url };
        }
      }
    });

    await Promise.all(workers);

    // reconstruir arrays
    for (const r of results) {
      if (r?.ok && r.buf) buffersValidos.push(r.buf);
      else if (r) fallidos.push(r.url);
    }

    if (buffersValidos.length === 0) {
      throw new Error('No se pudo descargar ningún PDF válido');
    }

    // 2) Crea el documento de salida
    const outDoc = await PDFDocument.create();

    // 3) Importa páginas de cada PDF fuente
    this.logger.log(`🧠 Iniciando merge de ${buffersValidos.length} PDFs`);
    for (let i = 0; i < buffersValidos.length; i += 1) {
      const srcBuf = buffersValidos[i];
      this.logger.log(`📄 Procesando PDF ${i + 1}/${buffersValidos.length}`);

      try {
        const srcDoc = await PDFDocument.load(srcBuf, {
          ignoreEncryption: true,
        });

        const pageIndices = srcDoc.getPageIndices();

        if (pageIndices.length === 0) continue;

        const pages = await outDoc.copyPages(srcDoc, pageIndices);

        for (const p of pages) outDoc.addPage(p);

        // 🔥 LIBERAR MEMORIA INMEDIATAMENTE
        buffersValidos[i] = null as any;
      } catch (err) {
        this.logger.warn(`⚠️ Error procesando PDF #${i}`);
      }
    }

    // 4) Serializa, guarda a disco y retorna
    const outBytes: Uint8Array = await outDoc.save(); // Uint8Array
    if (!outBytes || outBytes.length === 0) {
      throw new Error('Fallo al generar el PDF fusionado (salida vacía)');
    }
    const buffer = Buffer.from(outBytes);
    const fileSafe = fileName?.trim()?.length
      ? fileName.trim()
      : 'manifiestos_fusionados.pdf';
    const filePath = join(os.tmpdir(), fileSafe);

    await fs.writeFile(filePath, buffer);

    this.logger.log(
      `📄 PDF fusionado (pdf-lib): ${filePath} (${buffersValidos.length} documentos, ${fallidos.length} fallidos)`
    );

    return {
      buffer,
      path: filePath,
      count: buffersValidos.length,
      fallidos,
    };
  }

  private async descargarPdfComoBuffer(url: string): Promise<Buffer> {
    // Validación básica de URL en tiempo de ejecución (útil en modo estricto)
    try {
      // Lanzará si la URL no es válida

      new URL(url);
    } catch {
      throw new Error(`URL inválida: ${url}`);
    }

    let res: AxiosResponse<ArrayBuffer>;
    try {
      res = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: 120_000,
        validateStatus: (status) => status >= 200 && status < 400,
      });
    } catch (e) {
      throw new Error(
        `Error descargando PDF desde ${url}: ${(e as Error).message}`
      );
    }

    const buf = Buffer.from(res.data);
    if (buf.length === 0) {
      throw new Error(`Archivo vacío: ${url}`);
    }

    // Content-Type con comprobación segura
    const ctHeader = res.headers?.['content-type'];
    if (
      typeof ctHeader === 'string' &&
      !ctHeader.toLowerCase().includes('application/pdf')
    ) {
      this.logger.warn(`⚠️ Content-Type no es PDF (${ctHeader}) para: ${url}`);
    }

    return buf;
  }

  // pdf-uploader.service.ts
}
