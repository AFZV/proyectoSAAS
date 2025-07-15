"use client";

import { Loading } from "@/components/Loading";
import { useAuth } from "@clerk/nextjs";
import React, { useState } from "react";

export default function RespaldosPage() {
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const generarRespaldo = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      if (!token) throw new Error("Token no disponible");

      const respuesta = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/respaldos/copia`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!respuesta.ok) {
        throw new Error("Error al generar respaldo");
      }

      // Obtener nombre del archivo desde header
      const disposition = respuesta.headers.get("Content-Disposition");
      const fileName =
        disposition?.split("filename=")[1]?.replace(/"/g, "") ??
        `respaldo-${new Date().toISOString().replace(/[:.]/g, "-")}.backup`;

      const blob = await respuesta.blob();
      const url = URL.createObjectURL(blob);

      // Forzar descarga con el nombre proporcionado por el backend
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ Error al generar respaldo:", err);
      alert("Error al generar respaldo. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="text-center mt-10 space-y-4">
      {isLoading ? (
        <Loading title="Generando respaldo..." />
      ) : (
        <button
          onClick={generarRespaldo}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Generar respaldo
        </button>
      )}
    </div>
  );
}
