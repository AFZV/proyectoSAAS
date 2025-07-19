"use client";

import { useState, useEffect } from "react";
import { DataTable } from "./(components)/ListInventario/data-table";
import { columns } from "./(components)/ListInventario/columns";
import { ProductoInventario } from "./(components)/ListInventario/columns";
import { HeaderInventario } from "./(components)/HeaderInventario/HeaderInventario";
import { Package } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

export default function InventarioPage() {
  const [data, setData] = useState<ProductoInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState({
    totalProductos: 0,
    valorTotalInventario: 0,
    productosStockBajo: 0,
  });
  const { getToken } = useAuth();

  // función de carga
  const loadInventario = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No hay token");

      // Cargar productos
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/inventario/productosall`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      const productos = json.productos || [];
      setData(productos);

      // Calcular estadísticas
      const totalProductos = productos.length;
      let valorTotalInventario = 0;
      let productosStockBajo = 0;

      productos.forEach((producto: ProductoInventario) => {
        const stockActual = producto.inventario?.[0]?.stockActual || 0;
        const precioCompra = producto.precioCompra || 0;

        // Sumar valor total del inventario
        valorTotalInventario += stockActual * precioCompra;

        // Contar productos con stock bajo (menos de 10 unidades)
        if (stockActual > 0 && stockActual < 10) {
          productosStockBajo++;
        }
      });

      setEstadisticas({
        totalProductos,
        valorTotalInventario,
        productosStockBajo,
      });
    } catch (err) {
      console.error("Error cargando inventario:", err);
      setData([]);
      setEstadisticas({
        totalProductos: 0,
        valorTotalInventario: 0,
        productosStockBajo: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // cada vez que "montamos" el módulo, recargamos
  useEffect(() => {
    loadInventario();
  }, []);

  return (
    <section className="min-h-screen bg-background text-foreground">
      <div className="space-y-6 pb-6">
        {/* Header con estadísticas */}
        <HeaderInventario
          totalProductos={estadisticas.totalProductos}
          valorTotalInventario={estadisticas.valorTotalInventario}
          productosStockBajo={estadisticas.productosStockBajo}
          onRefresh={loadInventario}
        />

        {/* Contenido principal - Alineado con el header */}
        <div className="mx-6">
          {/* Tabla o loader */}
          <div className="bg-card rounded-lg border">
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Cargando inventario...</span>
                </div>
              ) : (
                <DataTable columns={columns} data={data} />
              )}
            </div>
          </div>

          {/* Mensaje cuando no hay datos */}
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
