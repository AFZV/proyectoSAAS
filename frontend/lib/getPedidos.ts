import { formatValue } from "@/utils/FormartValue";
import { db } from "./db";
import { inicioDia, finDia } from "@/utils/fechas";

export async function getPedidos(IdUsuario: string, tipoUsuario: string) {
  if (tipoUsuario === "admin") {
    const totalPedidosResult = await db.pedido.aggregate({
      where: {
        fecha: {
          gte: inicioDia,
          lte: finDia,
        },
      },
      _sum: {
        total: true,
      },
    });
    return formatValue(totalPedidosResult._sum.total ?? 0);
  } else {
    const totalPedidosResult = await db.pedido.aggregate({
      where: {
        vendedorId: IdUsuario,
        fecha: {
          gte: inicioDia,
          lte: finDia,
        },
      },
      _sum: {
        total: true,
      },
    });
    return formatValue(totalPedidosResult._sum.total ?? 0);
  }
}
