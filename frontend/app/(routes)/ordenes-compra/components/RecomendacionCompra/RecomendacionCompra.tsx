"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  Clock,
} from "lucide-react";

// ── tipos ──────────────────────────────────────────────────────────────────

type Semaforo = "CRITICO" | "REPONER" | "OK" | "SIN_VENTAS";

interface RecomendacionItem {
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
}

// ── helpers ────────────────────────────────────────────────────────────────

const SEMAFORO_META: Record<
  Semaforo,
  {
    label: string;
    icon: React.ReactNode;
    badgeClass: string;
    rowClass: string;
  }
> = {
  CRITICO: {
    label: "Crítico",
    icon: <AlertTriangle className="w-3 h-3" />,
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    rowClass: "bg-red-50/40",
  },
  REPONER: {
    label: "Reponer",
    icon: <Clock className="w-3 h-3" />,
    badgeClass: "bg-orange-100 text-orange-700 border-orange-200",
    rowClass: "bg-orange-50/30",
  },
  OK: {
    label: "OK",
    icon: <CheckCircle2 className="w-3 h-3" />,
    badgeClass: "bg-green-100 text-green-700 border-green-200",
    rowClass: "",
  },
  SIN_VENTAS: {
    label: "Sin ventas",
    icon: <MinusCircle className="w-3 h-3" />,
    badgeClass: "bg-gray-100 text-gray-500 border-gray-200",
    rowClass: "opacity-60",
  },
};

function SemaforoBadge({ semaforo }: { semaforo: Semaforo }) {
  const { label, icon, badgeClass } = SEMAFORO_META[semaforo];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}
    >
      {icon}
      {label}
    </span>
  );
}

function fmt(n: number) {
  return n.toLocaleString("es-CO");
}

function fmtCOP(n: number) {
  return `$${Math.round(n).toLocaleString("es-CO")}`;
}

// ── componente principal ───────────────────────────────────────────────────

export function RecomendacionCompra() {
  const { getToken } = useAuth();

  const [periodo, setPeriodo] = useState("30");
  const [diasObjetivo, setDiasObjetivo] = useState("60");
  const [data, setData] = useState<RecomendacionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [soloConRecomendacion, setSoloConRecomendacion] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/estadisticas/recomendacion-compra?periodo=${periodo}&diasObjetivo=${diasObjetivo}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
      );
      if (!res.ok) return;
      const raw: RecomendacionItem[] = await res.json();
      // ordenar alfabéticamente aquí en el cliente
      raw.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      setData(raw);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, diasObjetivo]);

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return data.filter((item) => {
      const coincide =
        !q ||
        item.nombre.toLowerCase().includes(q) ||
        (item.categoria ?? "").toLowerCase().includes(q) ||
        String(item.codigo).includes(q);
      const tieneRec = !soloConRecomendacion || item.unidadesRecomendadas > 0;
      return coincide && tieneRec;
    });
  }, [data, busqueda, soloConRecomendacion]);

  // resumen
  const resumen = useMemo(() => {
    const criticos = filtrados.filter((i) => i.semaforo === "CRITICO").length;
    const reponer = filtrados.filter((i) => i.semaforo === "REPONER").length;
    const inversionTotal = filtrados.reduce(
      (s, i) => s + i.inversionEstimada,
      0,
    );
    return { criticos, reponer, inversionTotal };
  }, [filtrados]);

  return (
    <section className="px-4 pb-8">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-card rounded-lg border p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <h2 className="text-base font-semibold">
                  Recomendación de Compra
                </h2>
                <p className="text-xs text-muted-foreground">
                  Qué comprar y cuánto, basado en ventas reales e inventario
                  actual
                </p>
              </div>
            </div>

            {/* Controles de período */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Ventas de:
                </span>
                <Select value={periodo} onValueChange={setPeriodo}>
                  <SelectTrigger className="h-8 w-[90px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 días</SelectItem>
                    <SelectItem value="30">30 días</SelectItem>
                    <SelectItem value="60">60 días</SelectItem>
                    <SelectItem value="90">90 días</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Objetivo:
                </span>
                <Select value={diasObjetivo} onValueChange={setDiasObjetivo}>
                  <SelectTrigger className="h-8 w-[90px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 días</SelectItem>
                    <SelectItem value="45">45 días</SelectItem>
                    <SelectItem value="60">60 días</SelectItem>
                    <SelectItem value="90">90 días</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={fetchData}
                disabled={loading}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`}
                />
                Actualizar
              </Button>
            </div>
          </div>

          {/* Tarjetas de resumen */}
          {!loading && data.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-md border bg-red-50 dark:bg-red-950/20 p-3">
                <p className="text-xs text-red-600 font-medium">Críticos</p>
                <p className="text-xl font-bold text-red-700">
                  {resumen.criticos}
                </p>
                <p className="text-xs text-red-500">≤ 15 días de stock</p>
              </div>
              <div className="rounded-md border bg-orange-50 dark:bg-orange-950/20 p-3">
                <p className="text-xs text-orange-600 font-medium">A Reponer</p>
                <p className="text-xl font-bold text-orange-700">
                  {resumen.reponer}
                </p>
                <p className="text-xs text-orange-500">16–30 días de stock</p>
              </div>
              <div className="rounded-md border bg-blue-50 dark:bg-blue-950/20 p-3 col-span-2 sm:col-span-1">
                <p className="text-xs text-blue-600 font-medium">
                  Inversión estimada
                </p>
                <p className="text-xl font-bold text-blue-700">
                  {fmtCOP(resumen.inversionTotal)}
                </p>
                <p className="text-xs text-blue-500">
                  Para cubrir {diasObjetivo} días
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Buscador y filtros */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, categoría o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={soloConRecomendacion ? "default" : "outline"}
            size="sm"
            onClick={() => setSoloConRecomendacion((v) => !v)}
          >
            Solo con recomendación
          </Button>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {filtrados.length} producto(s)
          </span>
        </div>

        {/* Tabla */}
        <div className="rounded-lg border bg-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Calculando recomendaciones...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="min-w-[200px]">Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Stock actual</TableHead>
                    <TableHead className="text-right">
                      Vendidas ({periodo}d)
                    </TableHead>
                    <TableHead className="text-right">Prom./día</TableHead>
                    <TableHead className="text-right">Días stock</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">
                      Uds. recomendadas
                    </TableHead>
                    <TableHead className="text-right">Bultos</TableHead>
                    <TableHead className="text-right">Inversión est.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {busqueda
                          ? "No hay productos que coincidan con la búsqueda"
                          : "No hay datos disponibles"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtrados.map((item) => {
                      const meta = SEMAFORO_META[item.semaforo];
                      return (
                        <TableRow
                          key={item.id}
                          className={`hover:bg-muted/40 ${meta.rowClass}`}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">
                                {item.nombre}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                #{item.codigo}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.categoria ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {fmt(item.stockActual)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {fmt(item.unidadesVendidas)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {item.promedioDiario > 0
                              ? item.promedioDiario.toFixed(1)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.diasStock !== null ? (
                              <span
                                className={
                                  item.diasStock <= 15
                                    ? "font-bold text-red-600"
                                    : item.diasStock <= 30
                                      ? "font-medium text-orange-600"
                                      : "text-green-700"
                                }
                              >
                                {item.diasStock}d
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <SemaforoBadge semaforo={item.semaforo} />
                          </TableCell>
                          <TableCell className="text-right">
                            {item.unidadesRecomendadas > 0 ? (
                              <span className="font-semibold text-blue-700">
                                {fmt(item.unidadesRecomendadas)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.bultosRecomendados !== null &&
                            item.bultosRecomendados > 0 ? (
                              <span className="font-medium">
                                {item.bultosRecomendados}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.inversionEstimada > 0 ? (
                              <span className="text-sm font-medium">
                                {fmtCOP(item.inversionEstimada)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Leyenda */}
        {!loading && data.length > 0 && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="font-medium">Estado:</span>
            {(["CRITICO", "REPONER", "OK", "SIN_VENTAS"] as Semaforo[]).map(
              (s) => (
                <span key={s} className="flex items-center gap-1">
                  <SemaforoBadge semaforo={s} />
                </span>
              ),
            )}
            <span className="ml-2">
              · Inversión estimada = unidades recomendadas × precio de compra
              (COP)
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
