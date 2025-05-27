import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs";

export async function POST(req: NextRequest) {
  const { userId } = auth(); // ID de Clerk
  const body = await req.json();
  const { carrito, observacion, clienteId } = body;

  try {
    if (!userId || !clienteId || !carrito?.length) {
      return NextResponse.json(
        { success: false, error: "Datos incompletos" },
        { status: 400 }
      );
    }

    const vendedor = await db.cliente.findUnique({
      where: { id: clienteId },
      select: { codigoVend: true },
    });

    if (!vendedor) {
      return NextResponse.json(
        {
          success: false,
          error: "Cliente no encontrado o sin vendedor asignado",
        },
        { status: 400 }
      );
    }

    const total = carrito.reduce(
      (acc: number, item: any) => acc + item.precio * item.cantidad,
      0
    );

    // Crear el pedido con productos y estado inicial "generado"
    const pedido = await db.pedido.create({
      data: {
        observaciones: observacion,
        total,
        clienteId,
        vendedorId: vendedor.codigoVend,
        productos: {
          create: carrito.map((producto: any) => ({
            cantidad: producto.cantidad,
            precio: producto.precio,
            producto: {
              connect: { id: producto.id },
            },
          })),
        },
        estados: {
          create: {
            estado: "generado", // Estado inicial
          },
        },
      },
      include: {
        productos: true,
        estados: true,
      },
    });

    return NextResponse.json({ success: true, pedido });
  } catch (error) {
    console.error("Error al guardar pedido:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
