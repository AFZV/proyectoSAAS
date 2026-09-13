// src/lib/catalogShareToken.ts
// Token firmado (HMAC-SHA256) para el catálogo público compartible.
// No usa JWT de librería a propósito: es un caso de uso simple (empresaId + expiración)
// y evitamos una dependencia extra. Firma independiente del secreto de Clerk.
import { createHmac, timingSafeEqual } from 'crypto';

export interface CatalogSharePayload {
  empresaId: string;
  exp: number; // epoch seconds
}

function getSecret(): string {
  const secret = process.env.CATALOG_SHARE_SECRET;
  if (!secret) {
    throw new Error('CATALOG_SHARE_SECRET no está configurado');
  }
  return secret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function sign(data: string): string {
  return base64url(createHmac('sha256', getSecret()).update(data).digest());
}

/** Genera un token `<payloadBase64url>.<firmaBase64url>` válido por `horas` (default 48h). */
export function signCatalogShareToken(
  empresaId: string,
  horas = 48
): string {
  const payload: CatalogSharePayload = {
    empresaId,
    exp: Math.floor(Date.now() / 1000) + horas * 3600,
  };
  const payloadB64 = base64url(JSON.stringify(payload));
  const firma = sign(payloadB64);
  return `${payloadB64}.${firma}`;
}

/** Verifica firma y expiración. Devuelve el payload o `null` si el token es inválido/expiró. */
export function verifyCatalogShareToken(
  token: string
): CatalogSharePayload | null {
  if (!token || typeof token !== 'string') return null;
  const [payloadB64, firma] = token.split('.');
  if (!payloadB64 || !firma) return null;

  const firmaEsperada = sign(payloadB64);

  // Comparación en tiempo constante, y de igual longitud (timingSafeEqual lo exige)
  const a = Buffer.from(firma);
  const b = Buffer.from(firmaEsperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64').toString('utf8')
    ) as CatalogSharePayload;
    if (!payload.empresaId || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null; // expirado
    return payload;
  } catch {
    return null;
  }
}
