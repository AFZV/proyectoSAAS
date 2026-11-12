// src/lib/catalogoPrecio.ts
//
// El catálogo público puede mostrar un precio distinto al de venta interno (precioVenta):
// un porcentaje adicional configurable por empresa (catalogoConfig.porcentajeCatalogoPublico).
// Esta misma función se usa en dos lugares que deben coincidir siempre:
//   1) productos.service.ts -> obtenerCatalogoPublicoPorEmpresa (lo que el cliente VE)
//   2) pedidos.service.ts -> resolverPedidoImportado (el precio con el que se CREA el pedido)
// Si alguna vez cambia la regla de redondeo, cambia en un solo lugar y queda consistente
// entre lo que se muestra y lo que se cobra.
export function aplicarPorcentajeCatalogoPublico(
  precioBase: number,
  porcentaje?: number | null
): number {
  if (!porcentaje || porcentaje <= 0) return precioBase;
  return Math.round(precioBase * (1 + porcentaje / 100));
}
