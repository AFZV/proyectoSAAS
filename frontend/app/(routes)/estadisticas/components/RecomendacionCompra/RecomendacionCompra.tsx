"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ShoppingCart, AlertTriangle, PackageCheck, Eye, EyeOff } from "lucide-react";
import { formatValue } from "@/utils/FormartValue";

type Semaforo = "CRITICO" | "REPONER" | "OK" | "SIN_VENTAS";

type RecomendacionItem = {
  id: string;
  codigo: number;
  nombre: string;
  categoria: string | null;
  precioCompra: number;
  unidadesPorBulto: number | null;
  stockActual: number;
  unidadesVendidas: number;
  promedioDiario: number;
  diasStock: number | null;
  semaforo: Semaforo;
  unidadesRecomendadas: number;
  bultosRecomendados: number | null;
  inversionEstimada: number;
};

const PERIODO_OPTS = [
  { label: "Últimos 30 días", value: 30 },
  { label: "Últimos 60 días", value: 60 },
  { label: "Últimos 90 días", value: 90 },
];

const OBJETIVO_OPTS = [
  { label: "30 días de stock", value: 30 },
  { label: "60 días de stock", value: 60 },
  { label: "90 días de stock", value: 90 },
  { label: "120 días de stock", value: 120 },
];

function SemaforoBadge({ s }: { s: Semaforo }) {
  if (s === "CRITICO")
    return (
      <Badge className="bg-red-100 text-red-700 border border-red-300 font-semibold">
        🔴 Crítico
      </Badge>
    );
  if (s === "REPONER")
    return (
      <Badge className="bg-amber-100 text-amber-700 border border-amber-300 font-semibold">
        🟡 Reponer
      </Badge>
    );
  if (s === "OK")
    return (
      <Badge className="bg-green-100 text-green-700 border border-green-300 font-semibold">
        🟢 OK
      </Badge>
    );
  return (
    <Badge variant="secondary" className="text-muted-foreground">
      Sin ventas
    </Badge>
  );
}

function DiasStockCell({ dias, semaforo }: { dias: number | null; semaforo: Semaforo }) {
  if (dias === null)
    return <span className="text-muted-foreground tabular-nums">—</span>;
  return (
    <span
      className={cn(
        "tabular-nums font-semibold",
        semaforo === "CRITICO" && "text-red-700",
        semaforo === "REPONER" && "text-amber-600",
        semaforo === "OK" && "text-green-700"
      )}
    >
      {dias} d
    </span>
  );
}

export function RecomendacionCompra() {
  const { getToken } = useAuth();
  const [periodo, setPeriodo] = useState(30);
  const [diasObjetivo, setDiasObjetivo] = useState(60);
  const [data, setData] = useState<RecomendacionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [mostrarSinVentas, setMostrarSinVentas] = useState(false);

  async function fetchData(p: number, obj: number) {
    setLoading(true);
    try {
      const token = await getToken();
      const url = `${process.env.NEXT_PUBLIC_API_URL}/estadisticas/recomendacion-compra?periodo=${p}&diasObjetivo=${obj}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(periodo, diasObjetivo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, diasObjetivo]);

  const visible = mostrarSinVentas
    ? data
    : data.filter((d) => d.semaforo !== "SIN_VENTAS");

  const criticos = data.filter((d) => d.semaforo === "CRITICO");
  const reponer = data.filter((d) => d.semaforo === "REPONER");
  const accionables = [...criticos, ...reponer];
  const totalInversion = accionables.reduce(
    (s, d) => s + d.inversionEstimada,
    0
  );
  const hasBultos = visible.some((d) => d.bultosRecomendados !== null);

  return (
    <Card className="border-blue-100/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-base font-semibold text-blue-700">
            Recomendación de Compra
          </CardTitle>
        </div>
        <CardDescription>
          Qué comprar y cuánto, basado en ventas reales e inventario actual.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              Analizar ventas de:
            </span>
            <div className="flex gap-1">
              {PERIODO_OPTS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setPeriodo(o.value)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium border transition-colors",
                    periodo === o.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-border text-muted-foreground hover:border-blue-400"
                  )}
                >
                  {o.label.replace("Últimos ", "")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              Objetivo:
            </span>
            <div className="flex gap-1">
              {OBJETIVO_OPTS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setDiasObjetivo(o.value)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium border transition-colors",
                    diasObjetivo === o.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-border text-muted-foreground hover:border-blue-400"
                  )}
                >
                  {o.label.replace(" de stock", "")}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Tarjetas resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-xs font-medium text-red-700">
                Críticos (≤ 15 días)
              </span>
            </div>
            <p className="text-2xl font-bold text-red-700">
              {criticos.length}
            </p>
            <p className="text-xs text-red-500 mt-0.5">
              productos requieren acción inmediata
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <PackageCheck className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">
                Reponer pronto (16–30 días)
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-700">
              {reponer.length}
            </p>
            <p className="text-xs text-amber-500 mt-0.5">
              productos por agotarse pronto
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">
                Inversión estimada
              </span>
            </div>
            <p className="text-xl font-bold text-blue-700 tabular-nums">
              {formatValue(totalInversion)}
            </p>
            <p className="text-xs text-blue-500 mt-0.5">
              para cubrir {diasObjetivo} días en críticos + reponer
            </p>
          </div>
        </div>

        {/* Toggle sin ventas */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground gap-1.5"
            onClick={() => setMostrarSinVentas((v) => !v)}
          >
            {mostrarSinVentas ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {mostrarSinVentas
              ? "Ocultar sin ventas"
              : `Mostrar sin ventas (${data.filter((d) => d.semaforo === "SIN_VENTAS").length})`}
          </Button>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Calculando recomendaciones…
          </div>
        ) : visible.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No hay productos que requieran atención en este período.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-blue-100">
            <Table>
              <TableHeader className="bg-blue-50/70">
                <TableRow>
                  <TableHead className="text-xs text-blue-600 uppercase w-24">
                    Estado
                  </TableHead>
                  <TableHead className="text-xs text-blue-600 uppercase">
                    Producto
                  </TableHead>
                  <TableHead className="text-xs text-blue-600 uppercase text-right">
                    Stock
                  </TableHead>
                  <TableHead className="text-xs text-blue-600 uppercase text-right">
                    Vendidos ({periodo}d)
                  </TableHead>
                  <TableHead className="text-xs text-blue-600 uppercase text-right">
                    Prom/día
                  </TableHead>
                  <TableHead className="text-xs text-blue-600 uppercase text-right">
                    Días restantes
                  </TableHead>
                  <TableHead className="text-xs text-blue-600 uppercase text-right">
                    A pedir (uds)
                  </TableHead>
                  {hasBultos && (
                    <TableHead className="text-xs text-blue-600 uppercase text-right">
                      A pedir (bultos)
                    </TableHead>
                  )}
                  <TableHead className="text-xs text-blue-600 uppercase text-right">
                    Inversión est.
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((item) => (
                  <TableRow
                    key={item.id}
                    className={cn(
                      "transition-colors",
                      item.semaforo === "CRITICO" &&
                        "bg-red-50/40 hover:bg-red-50/70",
                      item.semaforo === "REPONER" &&
                        "bg-amber-50/40 hover:bg-amber-50/70",
                      item.semaforo === "OK" && "hover:bg-green-50/30",
                      item.semaforo === "SIN_VENTAS" &&
                        "opacity-60 hover:opacity-80"
                    )}
                  >
                    <TableCell className="py-2.5">
                      <SemaforoBadge s={item.semaforo} />
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="font-medium text-sm leading-tight">
                        {item.nombre}
                      </div>
                      {item.categoria && (
                        <div className="text-xs text-muted-foreground">
                          {item.categoria}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5 text-right tabular-nums text-sm">
                      {item.stockActual.toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell className="py-2.5 text-right tabular-nums text-sm">
                      {item.unidadesVendidas.toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell className="py-2.5 text-right tabular-nums text-sm text-muted-foreground">
                      {item.promedioDiario.toFixed(1)}
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <DiasStockCell
                        dias={item.diasStock}
                        semaforo={item.semaforo}
                      />
                    </TableCell>
                    <TableCell className="py-2.5 text-right tabular-nums font-semibold text-sm">
                      {item.unidadesRecomendadas > 0
                        ? item.unidadesRecomendadas.toLocaleString("es-CO")
                        : <span className="text-muted-foreground font-normal">—</span>}
                    </TableCell>
                    {hasBultos && (
                      <TableCell className="py-2.5 text-right tabular-nums font-semibold text-sm">
                        {item.bultosRecomendados !== null && item.bultosRecomendados > 0
                          ? item.bultosRecomendados.toLocaleString("es-CO")
                          : <span className="text-muted-foreground font-normal">—</span>}
                      </TableCell>
                    )}
                    <TableCell className="py-2.5 text-right tabular-nums text-sm">
                      {item.inversionEstimada > 0
                        ? formatValue(item.inversionEstimada)
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          * Inversión estimada calculada con precio de compra registrado.
          La columna <strong>A pedir (bultos)</strong> solo aparece cuando al menos un producto tiene{" "}
          <em>unidades por bulto</em> configurado.
        </p>
      </CardContent>
    </Card>
  );
}
