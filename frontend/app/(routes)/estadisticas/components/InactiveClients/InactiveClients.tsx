"use client";
// ————————————————————————————————————————————————————————————————
// File: app/(dashboard)/estadisticas/components/InactiveClients/InactiveClients.tsx
import * as React from "react";
import { Users, Search, FileDown } from "lucide-react";
import { Cliente, TableClients } from "./table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function InactiveClients({ clientes }: { clientes: Cliente[] }) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) =>
      [c.nit, c.nombre, c.apellidos, c.rasonZocial, c.ciudad, c.usuario]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [clientes, query]);

  function exportCSV() {
    const headers = [
      "NIT",
      "NOMBRE",
      "APELLIDOS",
      "RAZON SOCIAL",
      "TELEFONO",
      "CIUDAD",
      "ESTADO",
      "VENDEDOR",
      "ULTIMA COMPRA",
    ];
    const rows = filtered.map((c) => [
      c.nit,
      c.nombre,
      c.apellidos,
      c.rasonZocial,
      c.telefono,
      c.ciudad,
      c.estado ? "Activo" : "Inactivo",
      c.usuario,
      c.ultimaCompra
        ? new Date(c.ultimaCompra).toLocaleDateString("es-CO")
        : "Sin compras",
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r.map((x) => `"${String(x ?? "").replaceAll('"', '""')}"`).join(",")
      )
      .join("");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes_inactivos_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="px-4">
      <div className="max-w-6xl mx-auto">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Lista de clientes sin pedidos por más de 90 días
                </CardTitle>
                <CardDescription>
                  Revisa y activa contactos con seguimiento comercial.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="self-start">
                {clientes.length} en total
              </Badge>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por NIT, nombre, ciudad, vendedor…"
                  className="pl-8"
                />
              </div>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <FileDown className="h-4 w-4 mr-2" /> Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Users className="w-6 h-6 mx-auto mb-2" />
                <p>No hay clientes que coincidan con la búsqueda.</p>
              </div>
            ) : (
              <div className="overflow-auto">
                <TableClients clientes={filtered} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
