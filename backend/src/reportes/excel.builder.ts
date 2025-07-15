// excel.builder.ts
import * as ExcelJS from 'exceljs';

export interface ColumnDef<T> {
  header: string;
  key: keyof T;
  width?: number;
  numFmt?: string;
}

export function buildExcel<T>(
  sheetName: string,
  columns: ColumnDef<T>[],
  rows: T[]
): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(sheetName);

  // 1) Cabecera
  sheet.addRow(columns.map(col => col.header));
  sheet.getRow(1).font = { bold: true };

  // 2) Filas de datos
  rows.forEach(row => {
    sheet.addRow(columns.map(col => row[col.key]));
  });

  // 3) Anchos y formatos
  sheet.columns = columns.map(col => ({
    key: String(col.key),
    width: col.width,
    style: col.numFmt ? { numFmt: col.numFmt } : undefined,
  }));

  // 4) Auto-filtro
  sheet.autoFilter = {
    from: 'A1',
    to: `${String.fromCharCode(65 + columns.length - 1)}1`,
  };

  return wb;
}
