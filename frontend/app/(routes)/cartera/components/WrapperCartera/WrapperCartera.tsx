"use client";
import { useState, useEffect } from "react";
import { CarteraStats, HeaderCartera } from "../HeaderCartera";
import { ListCartera } from "../ListCartera";
import {
  ClienteCartera,
  MovimientoCartera,
} from "../ListCartera/ListCartera.types";
import { useAuth } from "@clerk/nextjs";

export function WrapperCartera() {
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<ClienteCartera | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoCartera[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CarteraStats>({
    totalSaldo: 0,
    totalPositivos: 0,
    totalNegativos: 0,
  });

  const { getToken } = useAuth();

  // Fetch movimientos al seleccionar un cliente
  useEffect(() => {
    if (!clienteSeleccionado) return;

    const fetchMovimientos = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();

        // Fetch movimientos
        const resMov = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/balance/movimientos/${clienteSeleccionado.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!resMov.ok)
          throw new Error(`Error ${resMov.status}: ${resMov.statusText}`);
        const dataMov = await resMov.json();
        setMovimientos(dataMov.movimientos || []);

        // Fetch stats
        const resStats = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/balance/stats/${clienteSeleccionado.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!resStats.ok)
          throw new Error(`Error ${resStats.status}: ${resStats.statusText}`);
        const dataStats = await resStats.json();
        setStats({
          totalSaldo: dataStats.totalSaldo || 0,
          totalPositivos: dataStats.totalPositivos || 0,
          totalNegativos: dataStats.totalNegativos || 0,
        });
      } catch (e: any) {
        setError(e.message || "Error desconocido");
        setMovimientos([]);
        setStats({ totalSaldo: 0, totalPositivos: 0, totalNegativos: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchMovimientos();
  }, [clienteSeleccionado]);
  console.log("stats en el frontend:", stats);

  return (
    <div>
      <HeaderCartera
        stats={stats}
        onClienteSeleccionado={setClienteSeleccionado}
      />
      <ListCartera cliente={clienteSeleccionado} />
    </div>
  );
}
