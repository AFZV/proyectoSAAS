import React from "react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  paginaActual: number;
  totalPaginas: number;
  setPaginaActual: React.Dispatch<React.SetStateAction<number>>;
}

export function Pagination({
  paginaActual,
  totalPaginas,
  setPaginaActual,
}: PaginationProps) {
  if (totalPaginas <= 1) return null;

  // Mostrar un máximo de 5 páginas visibles (puedes ajustar)
  const getPaginasVisibles = () => {
    const visiblePages: number[] = [];

    const maxPagesToShow = 5;
    let startPage = Math.max(1, paginaActual - Math.floor(maxPagesToShow / 2));
    let endPage = startPage + maxPagesToShow - 1;

    if (endPage > totalPaginas) {
      endPage = totalPaginas;
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      visiblePages.push(i);
    }

    return visiblePages;
  };

  return (
    <div className="flex flex-wrap justify-center mt-6 gap-2 pb-3">
      <Button
        variant="outline"
        size="sm"
        disabled={paginaActual === 1}
        onClick={() => setPaginaActual((prev) => prev - 1)}
      >
        Anterior
      </Button>

      {getPaginasVisibles().map((page) => (
        <Button
          key={page}
          size="sm"
          variant={page === paginaActual ? "default" : "outline"}
          onClick={() => setPaginaActual(page)}
          className={page === paginaActual ? "bg-blue-600 text-white" : ""}
        >
          {page}
        </Button>
      ))}

      <Button
        variant="outline"
        size="sm"
        disabled={paginaActual === totalPaginas}
        onClick={() => setPaginaActual((prev) => prev + 1)}
      >
        Siguiente
      </Button>
    </div>
  );
}
