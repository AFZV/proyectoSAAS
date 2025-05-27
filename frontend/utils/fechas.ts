import { startOfDay, endOfDay } from "date-fns";
import { format, utcToZonedTime } from "date-fns-tz";

const timeZone = "America/Bogota"; // o la que uses
const now = new Date();
const zonedNow = utcToZonedTime(now, timeZone);
const formateada = format(zonedNow, "yyyy-MM-dd HH:mm:ssXXX", {
  timeZone: "America/Bogota",
});

export const inicioDia = startOfDay(
  utcToZonedTime(new Date(), "America/Bogota")
);
export const finDia = endOfDay(utcToZonedTime(new Date(), "America/Bogota"));

export function formatFecha(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const anio = fecha.getFullYear();
  return `${dia}/${mes}/${anio}`;
}
