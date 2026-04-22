"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselImage {
  url: string;
  orden: number;
  activo?: boolean;
}

interface ProductImageCarouselProps {
  imagenUrl: string; // imagen principal fallback
  imagenes?: CarouselImage[];
  alt: string;
  className?: string;
  onClick?: () => void;
}

export function ProductImageCarousel({
  imagenUrl,
  imagenes,
  alt,
  className = "",
  onClick,
}: ProductImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Construir lista de slides: primero las de ProductoImagen activas ordenadas,
  // si no hay ninguna usar imagenUrl como fallback
  const slides: string[] = React.useMemo(() => {
    // Slots 2 y 3 vienen de ProductoImagen (orden >= 2)
    const extraSlots = (imagenes || [])
      .filter((i) => i.url && i.activo && i.orden >= 2)
      .sort((a, b) => a.orden - b.orden)
      .map((i) => i.url);

    // Slot 1 siempre es imagenUrl de la tabla Producto
    const slot1 = imagenUrl || "/placeholder-product.png";

    return [slot1, ...extraSlots];
  }, [imagenes, imagenUrl]);

  const hasMultiple = slides.length > 1;

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((i) => (i === 0 ? slides.length - 1 : i - 1));
  };

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((i) => (i === slides.length - 1 ? 0 : i + 1));
  };

  return (
    <div className={`relative overflow-hidden ${className}`} onClick={onClick}>
      {/* Imagen actual */}
      <img
        src={slides[currentIndex]}
        alt={alt}
        className="w-full h-full object-contain transition-opacity duration-300"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/placeholder-product.png";
        }}
      />

      {/* Flechas — solo si hay más de 1 imagen */}
      {hasMultiple && (
        <>
          <button
            onClick={prev}
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition-colors z-10"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition-colors z-10"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Dots indicadores */}
      {hasMultiple && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(i);
              }}
              className={`rounded-full transition-all ${
                i === currentIndex ? "bg-white w-3 h-2" : "bg-white/50 w-2 h-2"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
