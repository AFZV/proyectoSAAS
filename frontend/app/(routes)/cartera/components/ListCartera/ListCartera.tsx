"use client";

import { useEffect, useState, useCallback } from "react";
import { getColumns } from "./columns"; // 👈 ya no importamos ClienteConBalance
import { DataTableBalance } from "./data-table";

import { useAuth } from "@clerk/nextjs";
import { CarteraDetalleModal } from "./CarteraDetalleModal";
import { ModalAjusteManual } from "../DetalleModalAjuste";
import type { ClienteCartera } from "./ListCartera.types";

export function ListCartera({ cliente }: { cliente: ClienteCartera | null }) {
  const [balance, setBalance] = useState<ClienteCartera | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAjuste, setShowAjuste] = useState(false);
  const { getToken } = useAuth();
  const [token, setToken] = useState("");

  // Obtener token una vez
  useEffect(() => {
    (async () => {
      const t = await getToken();
      if (t) setToken(t);
    })();
  }, [getToken]);

  // Obtener balance del cliente
  const fetchBalance = useCallback(async () => {
    if (!cliente) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/balance/balancePorCliente/${cliente.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Error al obtener balance");

      const result = await response.json();

      const nuevoBalance: ClienteCartera = {
        id: result.cliente.id,
        nit: result.cliente.nit ?? "",
        nombre:
          result.cliente.rasonZocial || result.cliente.nombre || "(Sin nombre)",
        apellidos: result.cliente.apellidos ?? "",
        telefono: result.cliente.telefono ?? "",
        ciudad: result.cliente.ciudad ?? "",
        email: result.cliente.email ?? "",
        usuario: result.nombre ?? "",
        balance: result.saldo ?? 0,
      };

      setBalance(nuevoBalance);
    } catch (err: any) {
      setError(err.message || "Error inesperado");
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [cliente, getToken]);

  // Ejecutar fetchBalance cuando cambia cliente
  useEffect(() => {
    if (cliente) {
      fetchBalance();
    } else {
      setBalance(null);
    }
  }, [cliente, fetchBalance]);

  if (!cliente) {
    return (
      <div className="text-center text-muted-foreground py-6">
        Selecciona un cliente para ver su balance.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center text-muted-foreground py-6">
        Cargando balance del cliente...
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-600 py-6">Error: {error}</div>;
  }

  if (!balance) return null;

  return (
    <>
      <DataTableBalance<ClienteCartera>
        columns={getColumns<ClienteCartera>(
          () => setShowModal(true),
          () => setShowAjuste(true)
        )}
        data={[balance]}
      />

      {showModal && (
        <CarteraDetalleModal
          open={showModal}
          onClose={() => setShowModal(false)}
          cliente={{
            id: balance.id,
            nombre: balance.nombre,
            apellidos: balance.apellidos ?? "",
            nit: balance.nit,
          }}
        />
      )}

      {showAjuste && (
        <ModalAjusteManual
          open={showAjuste}
          onClose={() => setShowAjuste(false)}
          cliente={{
            id: balance.id,
            nombre: balance.nombre,
          }}
          //token={token}
          onSuccess={() => {
            setShowAjuste(false);
            fetchBalance(); // 🔄 Actualiza tras ajuste
          }}
        />
      )}
    </>
  );
}
