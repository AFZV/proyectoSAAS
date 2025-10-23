import { authMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default authMiddleware({
  publicRoutes: ["/sign-in", "/sign-up"],

  async afterAuth(auth, req) {
    // Si el usuario está autenticado y va a la raíz "/"
    if (auth.userId && req.nextUrl.pathname === "/") {
      try {
        // Obtener el token de Clerk
        const token = await auth.getToken();

        // Llamar al backend para obtener el rol del usuario
        const userResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/usuario-actual`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (userResponse.ok) {
          const usuario = await userResponse.json();

          // ✅ Si es CLIENTE, redirigir al catálogo
          if (usuario?.rol === "CLIENTE") {
            return NextResponse.redirect(new URL("/catalog", req.url));
          }
        }
      } catch (error) {
        console.error("Error verificando rol del usuario:", error);
      }
    }

    // Para todos los demás casos, continuar normalmente
    return NextResponse.next();
  },
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)/admin/:path*",
  ],
};
