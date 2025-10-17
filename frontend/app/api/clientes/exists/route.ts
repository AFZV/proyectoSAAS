import { NextRequest, NextResponse } from "next/server";

/**
 * Historia 2: Validación por NIT (público, sin autenticación)
 * GET /api/clientes/exists?nit={nit}
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const nit = searchParams.get("nit");

    if (!nit) {
      return NextResponse.json(
        { error: "NIT es requerido" },
        { status: 400 }
      );
    }

    // Llamar al endpoint público del backend (sin autenticación)
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/clientes/public/exists?nit=${nit}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error validando NIT:", error);
    return NextResponse.json(
      { error: "Error al validar NIT" },
      { status: 500 }
    );
  }
}
