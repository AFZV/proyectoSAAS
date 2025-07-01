"use client";

import { useState, useEffect } from "react";
import { Compra, columns } from "./columns";
import { DataTable } from "./data-table";
import { getToken } from "@/lib/getToken";
import { AlertCircle, ShoppingCart, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NuevaCompraModal } from "./NuevaCompraModal";
import { useAuth } from "@clerk/nextjs";

// Función para obtener compras (ahora del lado cliente)
async function fetchCompras(token: string): Promise<Compra[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compras/findAll/empresa`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

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

// Componente principal
export default function ListComprasPage() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
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
    } catch (error) {
      console.error("Error cargando compras:", error);
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
  };

  return (
    <section className="min-h-screen bg-background text-foreground px-4 py-6">
      <div className="max-w-6xl mx-auto">
        {/* Encabezado */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Gestión de Compras</h1>
              <p className="text-muted-foreground">Administra y consulta todas las compras realizadas</p>
            </div>
            {/* Botón Nueva Compra */}
            <Button 
              onClick={() => setOpenModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Compra
            </Button>
          </div>
        </div>

        {/* Tabla de datos */}
        <div className="bg-card rounded-lg border">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Lista de Compras
              </h2>
              {compras.length === 0 && !loading && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  <span>No hay compras registradas</span>
                </div>
              )}
            </div>
            
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
          <div className="mt-6 text-center p-8 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              ¡Comienza a gestionar tus compras!
            </h3>
            <p className="text-blue-700 dark:text-blue-300 mb-4">
              Registra tu primera compra para comenzar a llevar el control de tu inventario.
            </p>
            <div className="text-sm text-blue-600 dark:text-blue-400 mb-4">
              💡 <strong>Tip:</strong> Las compras se sincronizan automáticamente con tu inventario
            </div>
            <Button 
              onClick={() => setOpenModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Crear Primera Compra
            </Button>
          </div>
        )}

        {/* Modal Nueva Compra */}
        <NuevaCompraModal 
          open={openModal}
          onClose={() => setOpenModal(false)}
          onCompraCreada={handleCompraCreada}
        />
      </div>
    </section>
  );
}