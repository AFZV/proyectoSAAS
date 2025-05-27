import { db } from "../db";
import { NextResponse } from "next/server";

export async function getPedidoPorId(id: string) {
  try {
    const pedido = await db.pedido.findUnique({
      where: {
        id: id,
      },
    });
    if (pedido) {
      console.log("esto llega d ela bdd en pedido:", pedido);
      return pedido;
    } else {
      return NextResponse.error();
    }
  } catch (error) {
    console.error(error);
  }
}
