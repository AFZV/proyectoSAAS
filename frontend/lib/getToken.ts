import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function getToken() {
  const { sessionId, userId } = auth();

  if (!sessionId || !userId) {
    console.error("❌ No hay sesión activa");
    redirect("/sign-in"); // ✅ Cambiado a /sign-in
  }

  const token = await clerkClient.sessions.getToken(sessionId, "token");

  if (!token || !token.includes(".")) {
    console.error("❌ Token JWT inválido o malformado:", token);
    redirect("/sign-in"); // ✅ Cambiado a /sign-in
  }

  return token;
}
