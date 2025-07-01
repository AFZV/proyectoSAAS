"use client";

import React, { useEffect, useState } from "react";
import { PackageSearch, TrendingDown, Users } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

export function HeaderEstadisticas() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    productosBajoStock: 0,
    productosSinRotacion: 0,
    clientesInactivos: 0,
  });

  const { getToken } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = await getToken();
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/estadisticas/stats`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-cache",
          }
        );

        if (response.ok) {
          const data = await response.json();
          setStats({
            productosBajoStock: data.ProductsLowStock.length,
            productosSinRotacion: data.productos.length,
            clientesInactivos: data.clientes.length,
          });
        }
      } catch (error) {
        console.error("Error al obtener estadísticas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="border-b bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
            <PackageSearch className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              ESTADÍSTICAS
            </h1>
            <p className="text-sm text-muted-foreground">
              Datos clave sobre inventario y clientes
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardStat
            title="Productos con poco stock"
            value={stats.productosBajoStock}
            icon={<PackageSearch className="w-4 h-4 text-white" />}
            color="blue"
            loading={loading}
          />
          <CardStat
            title="Productos con baja rotación"
            value={stats.productosSinRotacion}
            icon={<TrendingDown className="w-4 h-4 text-white" />}
            color="yellow"
            loading={loading}
          />
          <CardStat
            title="Clientes inactivos"
            value={stats.clientesInactivos}
            icon={<Users className="w-4 h-4 text-white" />}
            color="red"
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}

function CardStat({
  title,
  value,
  icon,
  color,
  loading,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "yellow" | "red";
  loading: boolean;
}) {
  const bgColor =
    color === "blue"
      ? "from-blue-500 to-blue-600"
      : color === "yellow"
        ? "from-yellow-500 to-yellow-600"
        : "from-red-500 to-red-600";

  const textColor =
    color === "blue"
      ? "text-blue-600"
      : color === "yellow"
        ? "text-yellow-600"
        : "text-red-600";

  const borderColor =
    color === "blue"
      ? "border-blue-100 dark:border-blue-800"
      : color === "yellow"
        ? "border-yellow-100 dark:border-yellow-800"
        : "border-red-100 dark:border-red-800";

  return (
    <div
      className={`bg-white dark:bg-gray-800/50 rounded-lg p-4 border ${borderColor} shadow-sm hover:shadow-md transition-all duration-200`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold ${textColor}`}>
            {loading ? "..." : String(value)}
          </p>
        </div>
        <div
          className={`w-8 h-8 bg-gradient-to-r ${bgColor} rounded-full flex items-center justify-center`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
