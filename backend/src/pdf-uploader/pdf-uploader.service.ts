// import { Injectable } from '@nestjs/common';
// import * as fs from 'fs';
// import * as path from 'path';
// import ejs from 'ejs';
// import * as puppeteer from 'puppeteer';
// import axios from 'axios';
// import FormData from 'form-data';
// import { Buffer } from 'buffer';

// type TipoDocumento = 'recibo' | 'pedido' | 'factura';

// @Injectable()
// export class PdfUploaderService {
//   async generarYSubirPDF({
//     data,
//     tipo,
//     entidadId,
//   }: {
//     data: any;
//     tipo: TipoDocumento;
//     usuarioId: string;
//     entidadId: string;
//   }): Promise<{ url: string; buffer: Buffer }> {
//     // 1. Cargar plantilla HTML
//     const plantillaPath = path.join(__dirname, `../../templates/${tipo}.ejs`);
//     if (!fs.existsSync(plantillaPath)) {
//       throw new Error(`No existe la plantilla para tipo: ${tipo}`);
//     }

//     const htmlTemplate = fs.readFileSync(plantillaPath, 'utf8');
//     const html = ejs.render(htmlTemplate, { ...data });

//     // 2. Generar PDF con Puppeteer
//     const browser = await puppeteer.launch({ headless: true });
//     const page = await browser.newPage();
//     await page.setContent(html, { waitUntil: 'networkidle0' });
//     const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
//     await browser.close();

//     // 3. Crear FormData clásico
//     const form = new FormData();
//     form.append('files', pdfBuffer, {
//       filename: `${entidadId}.pdf`,
//       contentType: 'application/pdf',
//     });

//     // 4. Subir archivo a UploadThing manualmente (ejemplo endpoint — debe ser real)
//     const response = await axios.post(
//       'https://uploadthing.com/api/uploadFiles',
//       form,
//       {
//         headers: form.getHeaders(),
//       },
//     );

//     const result = response.data;

//     if (!result || result.error || !result.data?.[0]?.url) {
//       throw new Error(
//         `Error al subir archivo a UploadThing: ${JSON.stringify(result)}`,
//       );
//     }

//     return {
//       url: result.data[0].url,
//       buffer: Buffer.from(pdfBuffer),
//     };
//   }
// }
