import { getEstadoPedidoPorId } from "@/lib/pedidos/getEstadoPedidoPorId";
import { getPedidoPorId } from "@/lib/pedidos/getPedidoPorId";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json(
        { error: "ID de pedido requerido" },
        { status: 400 }
      );
    } else {
      const pedido = await getEstadoPedidoPorId(id);
      return NextResponse.json(pedido);
    }
  } catch (error) {
    console.error("Error en API de pedidos (GET):", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
