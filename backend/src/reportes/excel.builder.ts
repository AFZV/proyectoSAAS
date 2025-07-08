import * as ExcelJS from 'exceljs';
export async function buildInventarioExcel(
  rows: Array<{
    nombre: string;
    cantidades: number;
    precio: number;
    total: number;
  }>
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Reporte de Inventario');

  // Cabecera
  sheet.addRow(['Nombre', 'Cantidad', 'Valor Unitario', 'Total']);
  sheet.getRow(1).font = { bold: true };

  // Filas de datos
  rows.forEach((r) => {
    sheet.addRow([r.nombre, r.cantidades, r.precio, r.total]);
  });

  // Anchos y formatos de columna
  sheet.columns = [
    { key: 'nombre', width: 40 },
    { key: 'cantidades', width: 12, style: { numFmt: '#,##0' } },
    { key: 'precio', width: 14, style: { numFmt: '[$$-en-US]#,##0.00' } },
    { key: 'total', width: 18, style: { numFmt: '[$$-en-US]#,##0.00' } },
  ];

  // Opcional: auto-filtro
  sheet.autoFilter = {
    from: 'A1',
    to: 'D1',
  };

  return wb;
}
