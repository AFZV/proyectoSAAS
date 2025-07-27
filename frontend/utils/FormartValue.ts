export function formatValue(value: number): string {
  if (!value) {
    return "$0";
  }
  try {
    return value.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
    });
  } catch (error) {
    return "$0";
  }
}
