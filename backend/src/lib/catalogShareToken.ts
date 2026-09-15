// src/lib/catalogShareToken.ts
// Token firmado para el catálogo público compartible (empresaId + expiración).
import { signPayload, verifyPayload } from './hmacToken';

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

/** Genera un token válido por `horas` (default 48h). */
export function signCatalogShareToken(
  empresaId: string,
  horas = 48
): string {
  const payload: CatalogSharePayload = {
    empresaId,
    exp: Math.floor(Date.now() / 1000) + horas * 3600,
  };
  return signPayload(payload, getSecret());
}

/** Verifica firma y expiración. Devuelve el payload o `null` si el token es inválido/expiró. */
export function verifyCatalogShareToken(
  token: string
): CatalogSharePayload | null {
  const payload = verifyPayload<CatalogSharePayload>(token, getSecret());
  if (!payload?.empresaId || !payload.exp) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null; // expirado
  return payload;
}
