/**
 * timezone.util.ts
 * Helper centralizado para manejo de fechas en zona horaria Colombia (America/Bogota, UTC-5).
 * Colombia NO tiene horario de verano, siempre es UTC-5.
 *
 * REGLA DE NEGOCIO:
 *   - Todas las fechas se interpretan y comparan en hora Bogotá (UTC-5).
 *   - Las fechas se almacenan en PostgreSQL en UTC (correcto).
 *   - Solo se ajusta la CONSULTA, nunca el almacenamiento.
 */

const TZ = 'America/Bogota';

/**
 * Convierte un string "YYYY-MM-DD" al inicio del día en Bogotá, devuelto como Date UTC.
 * Ejemplo: "2026-08-01" → 2026-08-01T05:00:00.000Z  (medianoche Bogotá en UTC)
 */
export function toStartOfDayBogota(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000-05:00`);
}

/**
 * Convierte un string "YYYY-MM-DD" al fin del día en Bogotá, devuelto como Date UTC.
 * Ejemplo: "2026-08-31" → 2026-09-01T04:59:59.999Z  (23:59:59.999 Bogotá en UTC)
 */
export function toEndOfDayBogota(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999-05:00`);
}

/**
 * Extrae la fecha de calendario "YYYY-MM-DD" que el usuario seleccionó.
 *
 * Los rangos de reportes vienen de un date picker del frontend que envía
 * "YYYY-MM-DD". Ese valor puede llegar como:
 *   - string plano  "2026-08-01"                → se toma tal cual
 *   - string ISO    "2026-08-01T00:00:00.000Z" → se toma la parte de fecha
 *   - Date (por @Type(() => Date) sobre "2026-08-01") = medianoche UTC
 *        → la fecha de calendario en UTC ES la que eligió el usuario.
 *
 * OJO: NO se convierte a hora Bogotá aquí. Convertir una medianoche UTC a
 * Bogotá (UTC-5) devolvería el día anterior y correría todo el rango 1 día.
 * La conversión a hora Bogotá se hace después en toStartOfDayBogota/
 * toEndOfDayBogota, que anclan ese día de calendario a las 00:00 / 23:59
 * hora Colombia.
 */
export function toDateStringBogota(date: Date | string): string {
  if (typeof date === 'string') {
    return date.slice(0, 10); // "YYYY-MM-DD"
  }
  return date.toISOString().slice(0, 10); // fecha de calendario en UTC
}

/**
 * Normaliza un rango de fechas (string o Date) al día completo en hora Bogotá.
 * Reemplaza el método normalizarRango() anterior que usaba setHours() del servidor.
 */
export function normalizarRangoBogota(
  fechaInicio: string | Date,
  fechaFin: string | Date,
): { inicio: Date; fin: Date } {
  const strInicio = toDateStringBogota(fechaInicio);
  const strFin = toDateStringBogota(fechaFin);
  return {
    inicio: toStartOfDayBogota(strInicio),
    fin: toEndOfDayBogota(strFin),
  };
}

/**
 * Devuelve el inicio y fin del día actual en hora Bogotá, como Dates UTC.
 */
export function getDiaRangoBogota(): { inicio: Date; fin: Date } {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  return {
    inicio: toStartOfDayBogota(hoy),
    fin: toEndOfDayBogota(hoy),
  };
}

/**
 * Devuelve los rangos del mes actual y mes anterior, ambos en hora Bogotá.
 * - rangoActual: desde día 1 del mes actual hasta hoy (fin del día)
 * - rangoAnterior: desde día 1 del mes anterior hasta mismo día del mes anterior (fin del día)
 */
export function obtenerRangosComparativosBogota(): {
  rangoActual: { desde: Date; hasta: Date };
  rangoAnterior: { desde: Date; hasta: Date };
} {
  // Fecha actual en Bogotá como string YYYY-MM-DD
  const hoyStr = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const [year, month, day] = hoyStr.split('-').map(Number);

  // Mes actual: día 1 hasta hoy
  const inicioMesActualStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const finMesActualStr = hoyStr;

  // Mes anterior
  const mesAnterior = month - 1 === 0 ? 12 : month - 1;
  const anioAnterior = month - 1 === 0 ? year - 1 : year;
  // Último día del mes anterior para limitar si el día actual no existe
  const ultimoDiaMesAnterior = new Date(year, month - 1, 0).getDate();
  const diaAnterior = Math.min(day, ultimoDiaMesAnterior);

  const inicioMesAnteriorStr = `${anioAnterior}-${String(mesAnterior).padStart(2, '0')}-01`;
  const finMesAnteriorStr = `${anioAnterior}-${String(mesAnterior).padStart(2, '0')}-${String(diaAnterior).padStart(2, '0')}`;

  return {
    rangoActual: {
      desde: toStartOfDayBogota(inicioMesActualStr),
      hasta: toEndOfDayBogota(finMesActualStr),
    },
    rangoAnterior: {
      desde: toStartOfDayBogota(inicioMesAnteriorStr),
      hasta: toEndOfDayBogota(finMesAnteriorStr),
    },
  };
}

/**
 * Extrae el índice del mes (0-11) de una fecha interpretada en hora Bogotá.
 * Usar en lugar de new Date(x).getMonth() para evitar desfase de timezone.
 */
export function getMonthBogota(date: Date): number {
  const mes = parseInt(
    date.toLocaleString('en-US', { timeZone: TZ, month: 'numeric' }),
    10,
  );
  return mes - 1; // 0-indexed
}

/**
 * Devuelve los límites del año completo en hora Bogotá.
 * Ejemplo: year=2026 → inicio=2026-01-01T05:00:00Z, fin=2027-01-01T04:59:59.999Z
 */
export function getAnioRangoBogota(year: number): { inicio: Date; fin: Date } {
  return {
    inicio: toStartOfDayBogota(`${year}-01-01`),
    fin: toEndOfDayBogota(`${year}-12-31`),
  };
}
