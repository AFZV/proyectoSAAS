import { getToken } from "@/lib/getToken";
import { InventarioClient } from "./(components)/InventarioClient/InventarioClient";
import type { ProductoInventario } from "./(components)/ListInventario/columns";

export default async function InventarioPage() {
  const token = await getToken();

  let productosInicial: ProductoInventario[] = [];
  if (token) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/inventario/productosall`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );
      if (res.ok) {
        const json = await res.json();
        productosInicial = json.productos || [];
      }
    } catch (err) {
      console.error("Error cargando inventario:", err);
    }
  }

  return <InventarioClient productosInicial={productosInicial} />;
}
