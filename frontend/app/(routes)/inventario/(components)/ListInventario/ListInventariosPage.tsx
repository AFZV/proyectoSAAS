
'use client'  

import { useState, useEffect } from "react";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { ProductoInventario } from "./columns";
import { Package } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function ListInventariosPage() {
  const [data, setData] = useState<ProductoInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  // función de carga
  const loadInventario = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No hay token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/inventario/productosall`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",       // forzar no cache para que siempre traiga datos frescos
        }
      );
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      setData(json.productos || []);
    } catch (err) {
      console.error("Error cargando inventario:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // cada vez que “montamos” el módulo, recargamos
  useEffect(() => {
    loadInventario();
  }, []);

  return (
    <section className="min-h-screen px-4 py-6 bg-background text-foreground">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Inventario de Productos</h1>
          <p className="text-sm text-muted-foreground">
            Lista de productos y stock de referencia
          </p>
        </header>

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
              Registra tu primer movimiento de inventario para llevar el control.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
