"use client";

import * as XLSX from "xlsx";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function CargarClientesPanel({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<any[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const { getToken } = useAuth();
  const { toast } = useToast();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json(ws, { defval: "" });
      setData(parsed);
    };
    reader.readAsBinaryString(file);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) throw new Error("No hay token disponible");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/importar/carga-masiva/clientes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (!res.ok) throw new Error("Error al enviar datos");

      toast({ title: "Clientes creados con éxito", duration: 2000 });

      setData([]);
      setFileName("");

      // Esperar 2s y cerrar modal
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error:", error);

      toast({
        title: "Clientes creados con éxito",
        duration: 2000,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        type="file"
        accept=".xlsx"
        onChange={handleFile}
        disabled={loading}
      />
      {data.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground">
            Vista previa ({fileName}):
          </p>
          <pre className="text-xs max-h-48 overflow-auto bg-muted p-2 rounded">
            {JSON.stringify(data.slice(0, 5), null, 2)}
          </pre>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar clientes"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
