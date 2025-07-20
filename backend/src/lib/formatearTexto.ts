export function formatearTexto(texto?: string): string {
  if (!texto) return '';

  return texto
    .normalize('NFD') // descompone letras acentuadas (Ej: "á" → "á")
    .replace(/[\u0300-\u036f]/g, '') // elimina los signos diacríticos (tildes)
    .toUpperCase()
    .trim();
}
