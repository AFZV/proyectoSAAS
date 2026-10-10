"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { columns, ReciboConRelaciones } from "./columns";
import { ClienteDataTable, type SortBy, type SortDir } from "./data-table";
import { Loading } from "@/components/Loading";

type Meta = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

const PAGE_SIZE = 20;

// Antes esta pantalla recibía TODOS los recibos de la empresa de una sola vez (miles de
// filas) y la tabla paginaba/filtraba/ordenaba en el navegador. Ahora cada página,
// búsqueda u orden se pide directamente al backend (GET /recibos/paginado).
export function ListRecaudos({
  dataInicial,
  metaInicial,
  rol,
}: {
  dataInicial: ReciboConRelaciones[];
  metaInicial: Meta | null;
  rol: string;
}) {
  const [data, setData] = useState<ReciboConRelaciones[]>(dataInicial ?? []);
  const [meta, setMeta] = useState<Meta | null>(metaInicial);
  const [loading, setLoading] = useState(false);
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("fecha");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const { getToken } = useAuth();

  // Debounce de la búsqueda
  useEffect(() => {
    const id = setTimeout(() => setSearch(rawSearch.trim()), 300);
    return () => clearTimeout(id);
  }, [rawSearch]);

  const fetchRecibos = useCallback(
    async (pagina: number) => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return;

        const params = new URLSearchParams({
          pagina: String(pagina),
          limite: String(PAGE_SIZE),
          sortBy,
          sortDir,
        });
        if (search) params.set("q", search);

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/recibos/paginado?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }
        );
        if (!res.ok) throw new Error("Error al cargar recibos");
        const json = await res.json();
        setData(json.data ?? []);
        setMeta(json.meta ?? null);
      } catch (e) {
        console.error("Error cargando recibos:", e);
      } finally {
        setLoading(false);
      }
    },
    [getToken, search, sortBy, sortDir]
  );

  // En el primer montaje ya tenemos la página 1 (traída en el server); solo refetch si
  // ese fetch inicial falló, o cuando cambian búsqueda/orden después de montar.
  const yaMontado = useRef(false);
  useEffect(() => {
    if (!yaMontado.current) {
      yaMontado.current = true;
      if (!metaInicial) fetchRecibos(1);
      return;
    }
    fetchRecibos(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sortBy, sortDir]);

  // Tanto "Crear Recibo" como "Actualizar Recibo" llaman a router.refresh() al terminar,
  // lo que vuelve a ejecutar page.tsx en el servidor — pero ese refresh de Next.js
  // preserva el estado de los Client Components (no los remonta), así que el useState de
  // arriba se quedaría con los datos viejos si no sincronizamos acá cuando llegan props
  // nuevas de dataInicial/metaInicial.
  const montadoParaSync = useRef(false);
  useEffect(() => {
    if (!montadoParaSync.current) {
      montadoParaSync.current = true;
      return;
    }
    setData(dataInicial ?? []);
    setMeta(metaInicial);
    setRawSearch("");
    setSearch("");
    setSortBy("fecha");
    setSortDir("desc");
  }, [dataInicial, metaInicial]);

  // Refresca la página que el usuario tiene abierta ahora mismo, sin perder su
  // búsqueda/orden actual — usado por el modal de "Editar recibo" de cada fila.
  const refrescarPaginaActual = useCallback(() => {
    fetchRecibos(meta?.currentPage ?? 1);
  }, [fetchRecibos, meta?.currentPage]);

  if (!data) {
    return <Loading title="Cargando recibos..." />;
  }

  return (
    <div className="container mx-auto py-10">
      <ClienteDataTable
        columns={columns(refrescarPaginaActual, rol === "admin")}
        data={data}
        loading={loading}
        totalItems={meta?.totalItems ?? 0}
        pageIndex={(meta?.currentPage ?? 1) - 1}
        pageCount={meta?.totalPages ?? 0}
        onPageChange={(pageIndex) => fetchRecibos(pageIndex + 1)}
        searchValue={rawSearch}
        onSearchChange={setRawSearch}
        sortBy={sortBy}
        sortDir={sortDir}
        onSortChange={(by, dir) => {
          setSortBy(by);
          setSortDir(dir);
        }}
      />
    </div>
  );
}
