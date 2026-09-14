// src/lib/pedidoImportToken.ts
// Token firmado para importar un carrito armado en el catálogo público como pedido dentro
// de la app (flujo: catálogo público -> WhatsApp -> vendedor/admin toca el link -> revisa
// y confirma el pedido ya logueado). Reusa CATALOG_SHARE_SECRET; el campo `type` evita que
// un token de catálogo se cuele como token de importación de pedido, o viceversa.
import { createHash } from 'crypto';
import { signPayload, verifyPayload } from './hmacToken';

export interface PedidoImportItem {
  productoId: string;
  cantidad: number;
}

export interface PedidoImportPayload {
  type: 'PEDIDO_IMPORT';
  empresaId: string;
  items: PedidoImportItem[];
  exp: number; // epoch seconds
}

function getSecret(): string {
  const secret = process.env.CATALOG_SHARE_SECRET;
  if (!secret) {
    throw new Error('CATALOG_SHARE_SECRET no está configurado');
  }
  return secret;
}

/** Genera un token válido por `horas` (default 7 días — da tiempo a que el vendedor lo revise). */
export function signPedidoImportToken(
  empresaId: string,
  items: PedidoImportItem[],
  horas = 24 * 7
): string {
  const payload: PedidoImportPayload = {
    type: 'PEDIDO_IMPORT',
    empresaId,
    items,
    exp: Math.floor(Date.now() / 1000) + horas * 3600,
  };
  return signPayload(payload, getSecret());
}

export function verifyPedidoImportToken(
  token: string
): PedidoImportPayload | null {
  const payload = verifyPayload<PedidoImportPayload>(token, getSecret());
  if (!payload) return null;
  if (payload.type !== 'PEDIDO_IMPORT') return null;
  if (!payload.empresaId || !Array.isArray(payload.items) || !payload.exp) {
    return null;
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) return null; // expirado
  return payload;
}

/**
 * Hash estable del token completo (no solo del payload) — se usa como llave única en
 * PedidoImportUsado para detectar reuso. No se guarda el token en claro en la base de datos.
 */
export function hashPedidoImportToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
