import { db } from "../db";

export async function getEstadoPedidoPorId(id: string) {
  try {
    const estadosPedido = await db.estadoPedido.findMany({
      where: {
        pedidoId: id,
      },
      orderBy: {
        fecha: "asc",
      },
    });

    return estadosPedido;
  } catch (error) {
    console.error("Error en getEstadoPedidoPorId:", error);
    throw error;
  }
}
