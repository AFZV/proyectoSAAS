import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Validar datos requeridos
        const { nit, nombre, apellidos, email, telefono, direccion, departamento, ciudad } = body;

        if (!nit || !nombre || !apellidos || !email || !telefono || !direccion || !departamento || !ciudad) {
            return NextResponse.json(
                { error: "Todos los campos requeridos deben ser proporcionados" },
                { status: 400 }
            );
        }

        // Llamar al backend para crear el cliente (sin autenticación, endpoint público)
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clientes/public-register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: errorText || "Error al crear cliente" },
                { status: response.status }
            );
        }

        const cliente = await response.json();

        return NextResponse.json(cliente, { status: 201 });
    } catch (error: any) {
        console.error("Error en /api/clientes/register:", error);
        return NextResponse.json(
            { error: error.message || "Error interno del servidor" },
            { status: 500 }
        );
    }
}
