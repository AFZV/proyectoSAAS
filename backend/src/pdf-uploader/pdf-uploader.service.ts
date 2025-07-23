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

import { ResumenPedidoDto } from './dto/resumen-pedido.dto';
import { ResumenReciboDto } from './dto/resumen-recibo.dto';

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
  | { productos: CatalogoProducto[] };

@Injectable()
export class PdfUploaderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PdfUploaderService.name);
  private browser: Browser | null = null;

  private templates: Record<
    'pedido' | 'recibo' | 'catalogo',
    TemplateFunction | null
  > = {
    pedido: null,
    recibo: null,
    catalogo: null,
  };

  private readonly templatePaths = {
    pedido: join(process.cwd(), 'src', 'templates', 'pedido.ejs'),
    recibo: join(process.cwd(), 'src', 'templates', 'recibo.ejs'),
    catalogo: join(process.cwd(), 'src', 'templates', 'catalogo.ejs'),
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

      const [pedidoHtml, reciboHtml, catalogoHtml] = await Promise.all([
        fs.readFile(this.templatePaths.pedido, 'utf8'),
        fs.readFile(this.templatePaths.recibo, 'utf8'),
        fs.readFile(this.templatePaths.catalogo, 'utf8'),
      ]);

      this.templates.pedido = compile(pedidoHtml);
      this.templates.recibo = compile(reciboHtml);
      this.templates.catalogo = compile(catalogoHtml);

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
    tipo: 'pedido' | 'recibo' | 'catalogo';
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
      timeout: 10000,
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
    tipo: 'pedido' | 'recibo' | 'catalogo',
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
    if (!this.browser) {
      throw new Error('Browser no inicializado');
    }

    const page = await this.browser.newPage();
    await page.setViewport({ width: 794, height: 1123 }); // A4
    return page;
  }

  private async generatePdfBuffer(page: Page): Promise<Buffer> {
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
    });

    return Buffer.from(buffer);
  }

  public healthCheck(): boolean {
    return Boolean(
      this.browser &&
        this.browser.isConnected() &&
        this.templates.pedido &&
        this.templates.recibo &&
        this.templates.catalogo
    );
  }

  public async reinitializeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
    await this.initializeBrowser();
  }
}
