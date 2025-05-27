import { db } from "@/lib/db";

import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const data = await req.json();

    if (!userId) {
      return new NextResponse("No Autorizado", { status: 401 });
    }

    const producto = await db.producto.create({
      data: {
        ...data,
      },
    });
    console.log("esto hay en data :", data);
    return NextResponse.json(producto);
  } catch (error) {
    console.log("el error es ....:", error);
    return new NextResponse("Error Interno", { status: 500 });
  }
}
