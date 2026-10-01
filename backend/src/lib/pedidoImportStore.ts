// src/lib/pedidoImportStore.ts
// Reemplaza a pedidoImportToken.ts: el carrito ya no viaja codificado dentro del link (un
// carrito de cientos de ítems volvía el link una sola "palabra" de varios KB — justo el tipo
// de cosa que WhatsApp o el portapapeles pueden truncar al reenviar, sin avisar a nadie). El
// carrito vive en PedidoImportPendiente; el link solo lleva este id — corto siempre, sin
// importar si el carrito tiene 5 ítems o 500.
import { randomBytes } from 'crypto';

/** Id opaco, no adivinable (192 bits) — no necesita firma HMAC porque se busca en la base. */
export function generarPedidoImportId(): string {
  return randomBytes(24).toString('base64url');
}
