"use client";

import { useAuth } from "@clerk/nextjs";
import React, { useState } from "react";
import { UploadCloud, RefreshCcw } from "lucide-react";
import { Loading } from "@/components/Loading";

export default function RestaurarRespaldoPage() {
  const { getToken } = useAuth();
  const [estado, setEstado] = useState<string | null>(null);
  const [archivoNombre, setArchivoNombre] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [restaurando, setRestaurando] = useState<boolean>(false);

  const handleArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivoNombre(file.name);
    setEstado("📤 Archivo cargado. Listo para restaurar.");
    setBase64(null); // limpiar anterior

    const reader = new FileReader();
    reader.onload = () => {
      const contenido = reader.result as string;
      setBase64(contenido);
    };
    reader.onerror = () => {
      setEstado("❌ Error al leer el archivo.");
    };

    reader.readAsText(file);
  };

  const confirmarRestauracion = async () => {
    if (!base64) return;

    setRestaurando(true);
    setEstado("♻️ Restaurando respaldo...");

    try {
      const token = await getToken();
      if (!token) throw new Error("Token no disponible");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/respaldos/restaurar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ base64 }),
        }
      );

      if (!response.ok) {
        throw new Error("Error al restaurar el respaldo");
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
      {restaurando && <Loading title="Restaurando Base De Datos...." />}
      <div className="text-center mt-10 space-y-4 max-w-md mx-auto">
        <h2 className="text-xl font-semibold">Restaurar respaldo de empresa</h2>

        {/* Selector de archivo */}
        <label className="cursor-pointer inline-block bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md text-sm font-medium border border-gray-300 transition-all">
          <UploadCloud className="inline-block w-4 h-4 mr-2" />
          Seleccionar archivo .backup
          <input
            type="file"
            accept=".backup"
            onChange={handleArchivo}
            className="hidden"
          />
        </label>

        {archivoNombre && (
          <p className="text-sm text-gray-600">📄 {archivoNombre}</p>
        )}

        {/* Botón para confirmar restauración */}
        {base64 && !restaurando && (
          <button
            onClick={confirmarRestauracion}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded inline-flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Restaurar ahora
          </button>
        )}

        {/* Mensaje de estado */}
        {estado && <p className="text-sm text-muted-foreground">{estado}</p>}
      </div>
    </>
  );
}
