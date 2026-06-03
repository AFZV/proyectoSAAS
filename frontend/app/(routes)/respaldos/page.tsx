"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, DatabaseBackup, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type Respaldo = {
  key: string;
  fileName: string;
  size: number;
  fecha: string;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function RespaldosPage() {
  const { getToken } = useAuth();
  const [respaldos, setRespaldos] = useState<Respaldo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [descargando, setDescargando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const mostrarMensaje = (tipo: "ok" | "error", texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 5000);
  };

  const cargarLista = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/respaldos/lista`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setRespaldos(await res.json());
    } catch {
      // lista vacía si falla
    } finally {
      setCargando(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { cargarLista(); }, [cargarLista]);

  const generarRespaldo = async () => {
    setGenerando(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/respaldos/copia`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al generar respaldo");
      mostrarMensaje("ok", "Respaldo generado y guardado en la nube correctamente.");
      await cargarLista();
    } catch {
      mostrarMensaje("error", "Error al generar respaldo. Intenta de nuevo.");
    } finally {
      setGenerando(false);
    }
  };

  const descargar = async (key: string, fileName: string) => {
    setDescargando(key);
    try {
      const token = await getToken();
      const res = await fetch(
        `${API}/respaldos/descargar?key=${encodeURIComponent(key)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      mostrarMensaje("error", "Error al obtener enlace de descarga.");
    } finally {
      setDescargando(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-5 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <DatabaseBackup className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Copias de seguridad</h1>
            <p className="text-xs text-muted-foreground">Respaldo automático diario · 2:00 AM</p>
          </div>
        </div>
        <button
          onClick={generarRespaldo}
          disabled={generando}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${generando ? "animate-spin" : ""}`} />
          {generando ? "Generando…" : "Generar ahora"}
        </button>
      </div>

      {/* Mensaje de estado */}
      {mensaje && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
          mensaje.tipo === "ok"
            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
            : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
        }`}>
          {mensaje.tipo === "ok"
            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
            : <AlertCircle className="h-4 w-4 shrink-0" />}
          {mensaje.texto}
        </div>
      )}

      {/* Lista de respaldos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            Respaldos disponibles
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {cargando ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Cargando respaldos…
            </div>
          ) : respaldos.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <DatabaseBackup className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No hay respaldos aún.</p>
              <p className="text-xs text-muted-foreground">Genera uno manualmente o espera el respaldo automático.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {respaldos.map((r) => (
                <div
                  key={r.key}
                  className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium text-foreground truncate">{r.fileName}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatFecha(r.fecha)}
                      </span>
                      <span>{formatBytes(r.size)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => descargar(r.key, r.fileName)}
                    disabled={descargando === r.key}
                    className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 shrink-0 transition-colors"
                  >
                    <Download className={`h-4 w-4 ${descargando === r.key ? "animate-bounce" : ""}`} />
                    {descargando === r.key ? "Preparando…" : "Descargar"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info restauración */}
      <p className="text-xs text-muted-foreground text-center">
        Para restaurar, ejecuta el archivo <code className="bg-muted px-1 rounded">.sql</code> en tu base de datos PostgreSQL con{" "}
        <code className="bg-muted px-1 rounded">psql -d nombre_bdd -f archivo.sql</code>
      </p>
    </div>
  );
}
