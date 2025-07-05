// app/api/clientePorNit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { getToken } from "@/lib/getToken";

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener NIT de los parámetros de consulta
    const { searchParams } = new URL(request.url);
    const nit = searchParams.get("nit");

    if (!nit) {
      return NextResponse.json({ error: "NIT es requerido" }, { status: 400 });
    }

    // Obtener token para el backend
    const token = await getToken();

    // Hacer petición al backend de clientes (igual que en FormUpdateCliente)
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/clientes/getByNit/${nit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Cliente no encontrado" },
          { status: 404 }
        );
      }
      throw new Error(`Error del backend: ${response.status}`);
    }

    const clientes = await response.json();

    // Si es un array, devolver el primero; si es un objeto, devolverlo directamente
    const cliente = Array.isArray(clientes) ? clientes[0] : clientes;

    return NextResponse.json(cliente);
  } catch (error) {
    console.error("Error en API clientePorNit:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
