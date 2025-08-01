"use client";

import * as XLSX from "xlsx";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function CargarInventarioPanel({ onClose }: { onClose: () => void }) {
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
      const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const mapped = raw
        .map((row: any) => ({
          idProducto: row["ID Producto"]?.toString().trim(),
          stock: Number(row["Stock Inicial"]),
        }))
        .filter(
          (item) =>
            item.idProducto &&
            item.idProducto.toLowerCase() !== "id producto" && // evita encabezado como fila
            !isNaN(item.stock)
        );

      setData(mapped);
    };
    reader.readAsBinaryString(file);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) throw new Error("No hay token disponible");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/importar/carga-masiva/inventario`,
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

      toast({ title: "Inventario actualizado con éxito", duration: 2000 });

      setData([]);
      setFileName("");

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error al cargar inventario",
        variant: "destructive",
        duration: 3000,
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
              "Enviar inventario"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
