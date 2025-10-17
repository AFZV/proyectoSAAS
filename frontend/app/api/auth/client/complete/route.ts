import { NextRequest, NextResponse } from "next/server";

/**
 * Historia 3: Completar registro de cliente existente
 * POST /api/auth/client/complete
 * Público (sin autenticación)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clerkUserId, email, clienteId, empresaId, rol, telefono } = body;

    // Validar datos requeridos
    if (!clerkUserId || !email || !clienteId || !empresaId || !rol) {
      return NextResponse.json(
        {
          error:
            "Todos los campos requeridos deben ser proporcionados (clerkUserId, email, clienteId, empresaId, rol)",
        },
        { status: 400 }
      );
    }

    // Llamar al backend para crear usuario en BD
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/client/complete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clerkUserId,
          email,
          clienteId,
          empresaId,
          rol,
          telefono,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || "Error al completar registro" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error completando registro:", error);
    return NextResponse.json(
      { error: "Error al completar registro" },
      { status: 500 }
    );
  }
}
