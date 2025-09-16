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
    'pedido' | 'recibo' | 'catalogo' | 'compra',
    TemplateFunction | null
  > = {
    pedido: null,
    recibo: null,
    catalogo: null,
    compra: null, // ⬅️ nuevo
  };

  private readonly templatePaths = {
    pedido: join(process.cwd(), 'src', 'templates', 'pedido.ejs'),
    recibo: join(process.cwd(), 'src', 'templates', 'recibo.ejs'),
    catalogo: join(process.cwd(), 'src', 'templates', 'catalogo.ejs'),
    compra: join(process.cwd(), 'src', 'templates', 'compra.ejs'), // ⬅️ nuevo
  };

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

      const [pedidoHtml, reciboHtml, catalogoHtml, compraHtml] =
        await Promise.all([
          fs.readFile(this.templatePaths.pedido, 'utf8'),
          fs.readFile(this.templatePaths.recibo, 'utf8'),
          fs.readFile(this.templatePaths.catalogo, 'utf8'),
          fs.readFile(this.templatePaths.compra, 'utf8'), // ⬅️ nuevo
        ]);

      this.templates.pedido = compile(pedidoHtml);
      this.templates.recibo = compile(reciboHtml);
      this.templates.catalogo = compile(catalogoHtml);
      this.templates.compra = compile(compraHtml); // ⬅️ nuevo

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
    return this.generarPDF({
      data: { productos },
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
    tipo: 'pedido' | 'recibo' | 'catalogo' | 'compra';
  }): Promise<{ buffer: Buffer; path: string }> {
    try {
      const html = this.renderTemplate(tipo, data);
      const page = await this.createPage();

      try {
        await this.loadContent(page, html);

        const buffer = await this.generatePdfBuffer(page);
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

  private renderTemplate(
    tipo: 'pedido' | 'recibo' | 'catalogo' | 'compra',
    data: TemplateData
  ): string {
    const template = this.templates[tipo];
    if (!template) {
      throw new Error(`Plantilla no compilada para tipo: ${tipo}`);
    }

    return template(data as unknown as Record<string, unknown>);
  }

  private async initializeBrowser(): Promise<void> {
    try {
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
        ],
      });
      this.logger.log('🧭 Browser initialized');
    } catch (error) {
      this.logger.error('❌ Error launching browser', error);
      throw error;
    }
  }

  private async createPage(): Promise<Page> {
    if (!this.browser) throw new Error('Browser no inicializado');
    const page = await this.browser.newPage();

    // Aumenta timeouts por defecto del Page
    page.setDefaultTimeout(180_000); // 3 min (interacciones)
    page.setDefaultNavigationTimeout(180_000); // 3 min (navegación)

    await page.setViewport({ width: 794, height: 1123 }); // A4
    await page.emulateMediaType('screen'); // por si tu CSS difiere
    return page;
  }

  private async generatePdfBuffer(page: Page): Promise<Buffer> {
    try {
      await page.waitForNetworkIdle({ idleTime: 1200, timeout: 90_000 });
    } catch {
      /* empty */
    }
    const buffer = await page.pdf({
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
    });

    return Buffer.from(buffer);
  }

  public healthCheck(): boolean {
    return Boolean(
      this.browser &&
        this.browser.isConnected() &&
        this.templates.pedido &&
        this.templates.recibo &&
        this.templates.catalogo &&
        this.templates.compra
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
    const html = this.renderTemplate('catalogo', { productos });
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
    for (const url of urls) {
      try {
        const buf = await this.descargarPdfComoBuffer(url);
        buffersValidos.push(buf);
        this.logger.log(`📥 PDF descargado ok (${buf.length} bytes): ${url}`);
      } catch (err) {
        this.logger.warn(
          `⚠️ No se pudo descargar PDF: ${url} :: ${String((err as Error)?.message ?? err)}`
        );
        fallidos.push(url);
      }
    }

    if (buffersValidos.length === 0) {
      throw new Error('No se pudo descargar ningún PDF válido');
    }

    // 2) Crea el documento de salida
    const outDoc = await PDFDocument.create();

    // 3) Importa páginas de cada PDF fuente
    for (let i = 0; i < buffersValidos.length; i += 1) {
      const srcBuf = buffersValidos[i];
      try {
        const srcDoc = await PDFDocument.load(srcBuf, {
          ignoreEncryption: true,
        });
        const pageIndices = srcDoc.getPageIndices(); // number[]
        if (pageIndices.length === 0) {
          this.logger.warn(`⚠️ PDF sin páginas (#${i + 1}), se omite.`);
          continue;
        }
        const pages = await outDoc.copyPages(srcDoc, pageIndices);
        for (const p of pages) outDoc.addPage(p);
      } catch (err) {
        this.logger.warn(
          `⚠️ No se pudo procesar un PDF (#${i + 1}). Se omite. Motivo: ${String((err as Error)?.message ?? err)}`
        );
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
