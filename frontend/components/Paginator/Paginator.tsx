"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginatorProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Paginator({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: PaginatorProps) {
  if (totalPages <= 1) return null;

  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalItems);

  // Genera el rango de páginas a mostrar (máx 5 botones)
  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i);
    if (page <= 2) return [0, 1, 2, 3, 4];
    if (page >= totalPages - 3) return Array.from({ length: 5 }, (_, i) => totalPages - 5 + i);
    return [page - 2, page - 1, page, page + 1, page + 2];
  };

  const pages = getPageNumbers();

  return (
    <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/50">
      <span className="text-xs text-muted-foreground tabular-nums">
        {from}–{to} de {totalItems} resultados
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pages[0] > 0 && (
          <>
            <PageBtn n={0} current={page} onClick={onPageChange} />
            {pages[0] > 1 && (
              <span className="text-xs text-muted-foreground px-1">…</span>
            )}
          </>
        )}

        {pages.map((n) => (
          <PageBtn key={n} n={n} current={page} onClick={onPageChange} />
        ))}

        {pages[pages.length - 1] < totalPages - 1 && (
          <>
            {pages[pages.length - 1] < totalPages - 2 && (
              <span className="text-xs text-muted-foreground px-1">…</span>
            )}
            <PageBtn n={totalPages - 1} current={page} onClick={onPageChange} />
          </>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function PageBtn({
  n,
  current,
  onClick,
}: {
  n: number;
  current: number;
  onClick: (n: number) => void;
}) {
  return (
    <button
      onClick={() => onClick(n)}
      className={cn(
        "h-7 min-w-7 px-2 rounded text-xs font-medium transition-colors",
        n === current
          ? "bg-blue-600 text-white"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {n + 1}
    </button>
  );
}
