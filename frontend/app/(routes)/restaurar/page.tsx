"use client";

import { useAuth } from "@clerk/nextjs";
import React, { useState } from "react";
import { UploadCloud, RefreshCcw } from "lucide-react";
import { Loading } from "@/components/Loading";

export default function RestaurarRespaldoPage() {
  const { getToken } = useAuth();
  const [estado, setEstado] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [restaurando, setRestaurando] = useState<boolean>(false);

  const handleArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivo(file);
    setEstado(`📤 Archivo seleccionado: ${file.name}`);
  };

  const confirmarRestauracion = async () => {
    if (!archivo) return;

    setRestaurando(true);
    setEstado("♻️ Restaurando respaldo...");

    try {
      const token = await getToken();
      if (!token) throw new Error("Token no disponible");

      const formData = new FormData();
      formData.append("file", archivo);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/respaldos/restaurar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const resultado = await response.json();
      setEstado(`✅ Restaurado correctamente: ${resultado.message || "OK"}`);
    } catch (error) {
      console.error(error);
      setEstado("❌ Error al restaurar el respaldo.");
    } finally {
      setRestaurando(false);
    }
  };

  return (
    <>
      {restaurando && <Loading title="Restaurando Base De Datos..." />}
      <div className="text-center mt-10 space-y-4 max-w-md mx-auto">
        <h2 className="text-xl font-semibold">Restaurar respaldo de empresa</h2>

        <label className="cursor-pointer inline-block bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md text-sm font-medium border border-gray-300 transition-all">
          <UploadCloud className="inline-block w-4 h-4 mr-2" />
          Seleccionar archivo .dump
          <input
            type="file"
            accept=".dump"
            onChange={handleArchivo}
            className="hidden"
          />
        </label>

        {archivo && <p className="text-sm text-gray-600">📄 {archivo.name}</p>}

        {archivo && !restaurando && (
          <button
            onClick={confirmarRestauracion}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded inline-flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Restaurar ahora
          </button>
        )}

        {estado && <p className="text-sm text-muted-foreground">{estado}</p>}
      </div>
    </>
  );
}
