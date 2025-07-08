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

  const { getToken } = useAuth();

  const stats: CarteraStats = {
    totalSaldo: 0,
    totalPositivos: 0,
    totalNegativos: 0,
  };

  // Fetch movimientos al seleccionar un cliente
  useEffect(() => {
    if (!clienteSeleccionado) return;

    const fetchMovimientos = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/balance/movimientos/${clienteSeleccionado.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

        const data = await res.json();
        console.log("esto llega  al front en movimientos :", movimientos);
        setMovimientos(data.movimientos || []);
      } catch (e: any) {
        setError(e.message || "Error desconocido");
        setMovimientos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMovimientos();
  }, [clienteSeleccionado]);

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
