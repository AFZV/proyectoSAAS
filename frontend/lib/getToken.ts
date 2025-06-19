// lib/getClerkToken.ts
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

let _cachedToken: string | null = null;

export async function getToken() {
  if (_cachedToken) return _cachedToken;

  const { sessionId, userId } = auth();

  if (!sessionId || !userId) {
    console.error("❌ No hay sesión activa");
    redirect("/noAutorizado");
  }

  const token = await clerkClient.sessions.getToken(sessionId, "token");

  if (!token || !token.includes(".")) {
    console.error("❌ Token JWT inválido o malformado:", token);
    redirect("/noAutorizado");
  }

  _cachedToken = token;
  return token;
}
