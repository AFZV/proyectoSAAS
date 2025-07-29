import { DateTime } from 'luxon';

/**
 * Convierte un rango de fechas local a UTC para consultas con Prisma/PostgreSQL.
 * Asegura que se incluya todo el día (desde 00:00 hasta 23:59 en la zona local).
 *
 * @param fechaInicio string | Date
 * @param fechaFin string | Date
 * @param zone string (ej: 'America/Bogota')
 */
export function convertirRangoUTC(
  fechaInicio: string | Date,
  fechaFin: string | Date,
  zone: string = 'America/Bogota'
): { inicioUTC: Date; finUTC: Date } {
  const inicioDateTime = DateTime.fromISO(String(fechaInicio), {
    zone,
  }) as DateTime;
  const finDateTime = DateTime.fromISO(String(fechaFin), { zone }) as DateTime;

  if (!inicioDateTime.isValid || !finDateTime.isValid) {
    throw new Error('Formato de fecha inválido');
  }

  const inicioUTC: Date = inicioDateTime.startOf('day').toUTC().toJSDate();
  const finUTC: Date = finDateTime.endOf('day').toUTC().toJSDate();

  return { inicioUTC, finUTC };
}
