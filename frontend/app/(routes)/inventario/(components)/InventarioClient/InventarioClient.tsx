"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { DataTable } from "../ListInventario/data-table";
import { columns } from "../ListInventario/columns";
import { ProductoInventario } from "../ListInventario/columns";
import { HeaderInventario } from "../HeaderInventario/HeaderInventario";
import { Package } from "lucide-react";

// Antes esta página completa era un Client Component: el navegador recibía el HTML
// vacío, hidrataba React y solo DESPUÉS disparaba el fetch de productos en un
// useEffect — una vuelta cliente-servidor completa antes de pedir el dato. Ahora
// page.tsx (Server Component) ya trae la página con los productos listos; este
// componente solo se encarga de la interactividad (filtro, botón actualizar).
export function InventarioClient({
  productosInicial,
}: {
  productosInicial: ProductoInventario[];
}) {
  const [data, setData] = useState<ProductoInventario[]>(productosInicial);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const { getToken } = useAuth();

  const estadisticas = useMemo(() => {
    let valorTotalInventario = 0;
    let productosStockBajo = 0;

    data.forEach((producto) => {
      const stockActual = producto.inventario?.[0]?.stockActual || 0;
      const precioCompra = producto.precioCompra || 0;

      valorTotalInventario += stockActual * precioCompra;

      if (stockActual > 0 && stockActual < 10) {
        productosStockBajo++;
      }
    });

    return {
      totalProductos: data.length,
      valorTotalInventario,
      productosStockBajo,
    };
  }, [data]);

  const loadInventario = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No hay token");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/inventario/productosall`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      setData(json.productos || []);
    } catch (err) {
      console.error("Error cargando inventario:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-background text-foreground">
      <div className="space-y-6 pb-6">
        <HeaderInventario
          totalProductos={estadisticas.totalProductos}
          valorTotalInventario={estadisticas.valorTotalInventario}
          productosStockBajo={estadisticas.productosStockBajo}
          onRefresh={loadInventario}
        />

        <div className="mx-6">
          <div className="bg-card rounded-lg border">
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Cargando inventario...</span>
                </div>
              ) : (
                <DataTable
                  columns={columns(loadInventario)}
                  data={data}
                  globalFilter={globalFilter}
                  onGlobalFilterChange={setGlobalFilter}
                />
              )}
            </div>
          </div>

          {!loading && data.length === 0 && (
            <div className="mt-6 text-center p-8 bg-blue-50 rounded-lg border border-blue-200">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                ¡Comienza a gestionar tu inventario!
              </h3>
              <p className="text-blue-700 mb-4">
                Registra tu primer movimiento de inventario para llevar el
                control.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
