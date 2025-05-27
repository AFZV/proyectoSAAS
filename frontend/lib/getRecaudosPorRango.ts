import { db } from "./db";
export async function getRecaudosPorRango(
  from: Date,
  to: Date,
  nombreVendedor: string
) {
  return await db.recibo.findMany({
    where: {
      creado: {
        gte: from,
        lte: to,
      },
      vendedor: {
        nombres: nombreVendedor,
      },
    },
    select: {
      id: true,
      tipo: true,
      creado: true,
      concepto: true,
      valor: true,
      cliente: {
        select: {
          nombres: true,
          apellidos: true,
        },
      },
      vendedor: {
        select: {
          nombres: true,
        },
      },
    },
  });
}
