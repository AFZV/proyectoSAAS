"use client";

import { useState, useEffect } from "react";
import { Compra, columns } from "./columns";
import { DataTable } from "./data-table";
import { HeaderCompras } from "../HeaderCompras/HeaderCompras";
import { AlertCircle, ShoppingCart, Package } from "lucide-react";
import { NuevaCompraModal } from "./NuevaCompraModal";
import { useAuth } from "@clerk/nextjs";

// Función para obtener compras
async function fetchCompras(token: string): Promise<Compra[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/compras/findAll/empresa`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      console.error("Error al obtener compras:", res.status, res.statusText);
      return [];
    }

    const data = await res.json();
    console.log("Datos de compras recibidos:", data);
    return data.compras || data || [];
  } catch (error) {
    console.error("Error en fetchCompras:", error);
    return [];
  }
}

// ✅ COMPONENTE CON EXPORT DEFAULT
function ListComprasPage() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [estadisticas, setEstadisticas] = useState({
    totalComprasHoy: 0,
    valorTotalComprasHoy: 0,
    totalProveedores: 0,
  });
  const { getToken: getClerkToken } = useAuth();

  // Cargar compras
  const loadCompras = async () => {
    try {
      setLoading(true);
      const token = await getClerkToken();
      if (!token) {
        console.error("No hay token de autenticación");
        return;
      }
      const data = await fetchCompras(token);
      setCompras(data);

      // Calcular estadísticas
      const hoy = new Date().toDateString();
      const comprasHoy = data.filter(
        (compra: Compra) => new Date(compra.FechaCompra).toDateString() === hoy
      );

      const totalComprasHoy = comprasHoy.length;
      const valorTotalComprasHoy = comprasHoy.reduce(
        (total: number, compra: Compra) => total + (compra.totalCompra || 0),
        0
      );

      // Obtener proveedores únicos
      const proveedoresUnicos = new Set(
        data.map((compra: Compra) => compra.proveedor)
      );
      const totalProveedores = proveedoresUnicos.size;

      setEstadisticas({
        totalComprasHoy,
        valorTotalComprasHoy,
        totalProveedores,
      });
    } catch (error) {
      console.error("Error cargando compras:", error);
      setEstadisticas({
        totalComprasHoy: 0,
        valorTotalComprasHoy: 0,
        totalProveedores: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // Cargar compras al montar el componente
  useEffect(() => {
    loadCompras();
  }, []);

  // Manejar cuando se crea una nueva compra
  const handleCompraCreada = () => {
    loadCompras(); // Recargar la lista
    setOpenModal(false); // Cerrar modal
  };

  const handleNuevaCompra = () => {
    setOpenModal(true);
  };

  return (
    <section className="min-h-screen bg-background text-foreground">
      <div className="space-y-6 pb-6">
        {/* Header con estadísticas */}
        <HeaderCompras
          totalComprasHoy={estadisticas.totalComprasHoy}
          valorTotalComprasHoy={estadisticas.valorTotalComprasHoy}
          totalProveedores={estadisticas.totalProveedores}
          onRefresh={loadCompras}
          onNuevaCompra={handleNuevaCompra}
        />

        {/* Contenido principal - Alineado con el header */}
        <div className="mx-6">
          {/* Tabla de datos */}
          <div className="bg-card rounded-lg border">
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Cargando compras...</span>
                </div>
              ) : (
                <DataTable columns={columns} data={compras} />
              )}
            </div>
          </div>

          {/* Mensaje de ayuda cuando no hay compras */}
          {compras.length === 0 && !loading && (
            <div className="mt-6 text-center p-8 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                ¡Comienza a gestionar tus compras!
              </h3>
              <p className="text-green-700 dark:text-green-300 mb-4">
                Registra tu primera compra para comenzar a llevar el control de
                tu inventario.
              </p>
              <div className="text-sm text-green-600 dark:text-green-400 mb-4">
                💡 <strong>Tip:</strong> Las compras se sincronizan
                automáticamente con tu inventario
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nueva Compra */}
      <NuevaCompraModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCompraCreada={handleCompraCreada}
      />
    </section>
  );
}

// ✅ EXPORT DEFAULT AQUÍ
export default ListComprasPage;
