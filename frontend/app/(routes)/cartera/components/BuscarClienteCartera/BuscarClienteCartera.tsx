"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, Search } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ClienteMin = {
  id: string;
  nit: string;
  nombre: string;
  apellidos?: string;
  rasonZocial?: string;
  telefono?: string;
  email?: string;
  ciudad?: string;
};

export type ClienteCartera = {
  id: string;
  nit: string;
  nombre: string;
  apellidos?: string;
  telefono?: string;
  email?: string;
  ciudad?: string;
  balance: number;
  usuario?: string;
};

function normalize(str: string) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // elimina diacríticos
    .toLowerCase();
}

function onlyDigits(str: string) {
  return (str || "").replace(/\D/g, "");
}

function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = normalize(text).indexOf(normalize(query));
  if (idx === -1) return text;
  const end = idx + query.length;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200">{text.slice(idx, end)}</mark>
      {text.slice(end)}
    </>
  );
}

// ...imports iguales

export function BuscarClienteCartera({
  onClienteSeleccionado,
  endpointAll = `${process.env.NEXT_PUBLIC_API_URL}/clientes/all-min`,
  maxItems = 100,
  minChars = 0,
}: {
  onClienteSeleccionado: (cliente: ClienteCartera) => void;
  endpointAll?: string;
  maxItems?: number;
  minChars?: number;
}) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [clientes, setClientes] = useState<ClienteMin[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // carga de clientes igual...
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const token = await getToken();
        const res = await fetch(endpointAll, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("No se pudo cargar la lista de clientes");
        const data: ClienteMin[] = await res.json();
        if (mounted) setClientes(data || []);
      } catch (err: any) {
        toast({
          title: "Error",
          description: err?.message || "Fallo cargando clientes",
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [endpointAll, getToken, toast]);

  // filtered igual...
  const filtered = useMemo(() => {
    const q = query.trim();
    const qDigits = onlyDigits(q);
    const isNit = qDigits.length > 0;

    const byName = (c: ClienteMin) => {
      const full = `${c.rasonZocial || ""} ${c.nombre || ""} ${
        c.apellidos || ""
      }`.trim();
      return normalize(full).includes(normalize(q));
    };
    const byNit = (c: ClienteMin) => onlyDigits(c.nit).includes(qDigits);

    let result =
      q.length < minChars
        ? clientes
        : clientes.filter((c) => (isNit ? byNit(c) || byName(c) : byName(c)));

    if (isNit) {
      result = result.sort((a, b) => {
        const aExact = onlyDigits(a.nit) === qDigits ? 0 : 1;
        const bExact = onlyDigits(b.nit) === qDigits ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        const an = (
          a.rasonZocial || `${a.nombre || ""} ${a.apellidos || ""}`
        ).trim();
        const bn = (
          b.rasonZocial || `${b.nombre || ""} ${b.apellidos || ""}`
        ).trim();
        return an.localeCompare(bn, "es", { sensitivity: "base" });
      });
    } else {
      result = result.sort((a, b) => {
        const an = (
          a.rasonZocial || `${a.nombre || ""} ${a.apellidos || ""}`
        ).trim();
        const bn = (
          b.rasonZocial || `${b.nombre || ""} ${b.apellidos || ""}`
        ).trim();
        return an.localeCompare(bn, "es", { sensitivity: "base" });
      });
    }
    return result.slice(0, maxItems);
  }, [clientes, query, maxItems, minChars]);

  function handleSelect(c: ClienteMin) {
    const clienteCartera: ClienteCartera = {
      id: c.id,
      nit: c.nit,
      nombre: c.rasonZocial || c.nombre || "",
      apellidos: c.apellidos || "",
      telefono: c.telefono || "",
      email: c.email || "",
      ciudad: c.ciudad || "",
      balance: 0,
    };
    onClienteSeleccionado(clienteCartera);
    setQuery(c.rasonZocial || `${c.nombre || ""} ${c.apellidos || ""}`.trim());
    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!filtered.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sel = filtered[activeIndex] || filtered[0];
      if (sel) handleSelect(sel);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="w-full">
      <label className="mb-1 block text-sm font-medium text-muted-foreground">
        Buscar cliente por NIT o nombre
      </label>

      <div className="flex items-center gap-2">
        <Search className="w-5 h-5 text-muted-foreground" />
        {/* ✅ Input trigger: solo click, sin onFocus; readonly para no escribir fuera del modal */}
        <Input
          ref={inputRef}
          value={query}
          readOnly
          onClick={() => setOpen(true)}
          placeholder="Ej: 900123456 o Juan Pérez"
          className="flex-1 cursor-pointer"
        />
        <Button
          type="button"
          disabled={loading}
          onClick={() => window.location.reload()}
          variant="secondary"
          className="flex items-center"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Cargando
            </>
          ) : (
            "Recargar"
          )}
        </Button>
      </div>

      {/* Modal grande */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            // ✅ evita reabrir al devolver foco: quita el foco del input trigger
            requestAnimationFrame(() => inputRef.current?.blur());
          }
        }}
      >
        <DialogContent className="max-w-4xl w-[90vw] max-h-[80vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Seleccionar cliente</DialogTitle>
          </DialogHeader>

          {/* Barra de búsqueda dentro del modal */}
          <div className="px-6 pb-3">
            <Input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(-1);
              }}
              onKeyDown={onKeyDown}
              placeholder="Escribe NIT o nombre para filtrar…"
            />
          </div>

          {/* Lista grande con scroll */}
          <div className="overflow-auto max-h-[60vh] border-t">
            {loading && (
              <div className="px-6 py-4 text-sm text-muted-foreground">
                Cargando clientes…
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="px-6 py-4 text-sm text-muted-foreground">
                No hay coincidencias
              </div>
            )}

            {!loading &&
              filtered.map((c, i) => {
                const lineaNombre =
                  (c.rasonZocial || "").trim() || "(Sin razón social)";
                const nombreCompleto = `${c.nombre || ""} ${
                  c.apellidos || ""
                }`.trim();
                const isActive = i === activeIndex;

                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`w-full text-left px-6 py-3 text-sm hover:bg-muted/60 ${
                      isActive ? "bg-muted/80" : ""
                    }`}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => handleSelect(c)}
                  >
                    <div className="font-medium text-base">
                      {highlight(lineaNombre, query)}
                    </div>

                    {nombreCompleto && (
                      <div className="text-sm text-gray-600">
                        {highlight(nombreCompleto, query)}
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground mt-1">
                      NIT: {highlight(c.nit, onlyDigits(query))}
                    </div>
                  </button>
                );
              })}
          </div>

          <div className="px-6 py-3 border-t flex items-center justify-between text-xs text-muted-foreground">
            <div>
              {filtered.length} resultados {query ? "filtrados" : "totales"}
            </div>
            <div>
              ↑/↓ para navegar • Enter para seleccionar • Esc para cerrar
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
