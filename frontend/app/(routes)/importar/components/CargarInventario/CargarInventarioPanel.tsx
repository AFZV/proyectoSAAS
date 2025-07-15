"use client";

import * as XLSX from "xlsx";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CargarInventarioPanel({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<any[]>([]);
  const [fileName, setFileName] = useState("");

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
      const res = await fetch("/api/carga-masiva/inventario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Error al enviar datos");
      onClose();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="space-y-4">
      <Input type="file" accept=".xlsx" onChange={handleFile} />
      {data.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground">
            Vista previa ({fileName}):
          </p>
          <pre className="text-xs max-h-48 overflow-auto bg-muted p-2 rounded">
            {JSON.stringify(data.slice(0, 5), null, 2)}
          </pre>
          <Button onClick={handleSubmit}>Enviar inventario</Button>
        </div>
      )}
    </div>
  );
}
