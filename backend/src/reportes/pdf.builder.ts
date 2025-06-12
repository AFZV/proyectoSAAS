// src/reportes/pdf.builder.ts
import PDFDocument = require('pdfkit');

export function buildInventarioPDF(
  rows: Array<{ nombre: string; cantidades: number; precio: number; total: number }>,
): PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
  });

  // — Título —
  doc.fontSize(20).text('Reporte de Inventario', { align: 'center' }).moveDown(1);

  // — Configuración de tabla —
  const margin = { top: 80, left: 50, right: 50, bottom: 50 };
  const usableWidth = doc.page.width - margin.left - margin.right;
  const col1 = { x: margin.left,            width: usableWidth * 0.4  };
  const col2 = { x: col1.x + col1.width,    width: usableWidth * 0.15 };
  const col3 = { x: col2.x + col2.width,    width: usableWidth * 0.2  };
  const col4 = { x: col3.x + col3.width,    width: usableWidth * 0.25 };
  const rowH  = 30;

  // — Borde exterior de la tabla —
  const totalRows = rows.length + 1;
  const tableHeight = totalRows * rowH;
  const tableTopY = margin.top;
  doc
    .lineWidth(1)
    .rect(col1.x - 2, tableTopY - 2, usableWidth + 4, tableHeight + 4)
    .stroke();

  // — Cabecera —
  let y = tableTopY;
  doc.fontSize(12).font('Helvetica-Bold');
  doc
    .text('Nombre',         col1.x, y, { width: col1.width, align: 'left' })
    .text('Cantidad',       col2.x, y, { width: col2.width, align: 'right' })
    .text('Valor Unitario', col3.x, y, { width: col3.width, align: 'right' })
    .text('Total',          col4.x, y, { width: col4.width, align: 'right' });

  y += rowH;
  doc.font('Helvetica');

  // — Filas de datos —
  for (const r of rows) {
    // línea separadora
    doc
      .moveTo(col1.x - 2,                y - 2)
      .lineTo(col1.x - 2 + usableWidth + 4, y - 2)
      .stroke();

    doc
      .text(r.nombre,                   col1.x, y, { width: col1.width, align: 'left',  height: rowH, lineGap: 4 })
      .text(r.cantidades.toLocaleString(), col2.x, y, { width: col2.width, align: 'right' })
      .text(`$${r.precio.toLocaleString()}`,  col3.x, y, { width: col3.width, align: 'right' })
      .text(`$${r.total.toLocaleString()}`,   col4.x, y, { width: col4.width, align: 'right' });

    y += rowH;

    // paginar si se desborda
    if (y + margin.bottom > doc.page.height) {
      doc.addPage();
      y = margin.top;
    }
  }

  // cerramos el doc (pero no hacemos pipe ni res.end aquí)
  doc.end();
  return doc;
}
