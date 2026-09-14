// src/lib/hmacToken.ts
// Firma/verificación genérica de tokens HMAC-SHA256 `<payloadBase64url>~<firmaBase64url>`.
// Sin JWT de librería a propósito: caso de uso simple, evita una dependencia extra.
// Usado por catalogShareToken.ts y pedidoImportToken.ts, cada uno con su propio shape
// de payload (y ambos deberían incluir su propio `exp`, verificado por el llamador).
//
// El separador es "~" y NO "." a propósito: estos tokens viajan como segmento de URL
// (ej. /invoices/importar/<token>), y el matcher de middleware de Next.js excluye por
// regex cualquier path con ".<extensión-de-archivo-estática>" (css, js, png, ico, etc.)
// para no correr el middleware sobre assets estáticos. Una firma HMAC en base64url es
// esencialmente aleatoria, así que un token con "." tiene una probalidad (baja, pero
// real) de que justo después del punto caiga algo como "ico" o "css" por azar, lo que
// hace que Next salte el middleware para ESA request en particular -> Clerk explota con
// "auth() was called but Clerk can't detect usage of authMiddleware()". "~" no forma
// parte del alfabeto base64url, así que no hay ambigüedad al separar, y el token nunca
// contiene un ".", eliminando esta clase de bug por completo.
import { createHmac, timingSafeEqual } from 'crypto';

const SEPARADOR = '~';

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function signPayload(payload: unknown, secret: string): string {
  const payloadB64 = base64url(JSON.stringify(payload));
  const firma = base64url(createHmac('sha256', secret).update(payloadB64).digest());
  return `${payloadB64}${SEPARADOR}${firma}`;
}

/** Verifica la firma (no la expiración — eso lo revisa cada llamador sobre su payload). */
export function verifyPayload<T>(token: string, secret: string): T | null {
  if (!token || typeof token !== 'string') return null;
  const [payloadB64, firma] = token.split(SEPARADOR);
  if (!payloadB64 || !firma) return null;

  const firmaEsperada = base64url(
    createHmac('sha256', secret).update(payloadB64).digest(),
  );

  const a = Buffer.from(firma);
  const b = Buffer.from(firmaEsperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8')) as T;
  } catch {
    return null;
  }
}
