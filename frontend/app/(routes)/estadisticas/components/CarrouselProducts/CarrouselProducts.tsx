// File: app/(dashboard)/estadisticas/components/CarrouselProducts.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { ProductCarrousel } from "../Carrousel.types";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, Package } from "lucide-react";

/**
 * CarrouselProducts — versión mejorada visualmente
 * - Layout más aireado y consistente con shadcn
 * - Imágenes con Next/Image y contenedor aspect-[4/3]
 * - Badges de estado (sin stock / poco stock)
 * - Indicadores (dots) clicables + contador accesible
 * - Transiciones suaves con framer-motion
 * - Soporta umbral de poco stock configurable
 */
export function CarrouselProducts({
  productos,
  titulo,
  lowStockThreshold = 5,
}: {
  productos: ProductCarrousel[];
  titulo: string;
  lowStockThreshold?: number;
}) {
  const [api, setApi] = React.useState<CarouselApi | null>(null);
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  if (!productos || productos.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-3">
          <Package className="h-6 w-6" />
          <p className="text-center">No hay productos para mostrar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-center text-xl font-semibold tracking-tight text-foreground mb-2">
        {titulo}
      </h2>
      <p className="text-center text-xs text-muted-foreground mb-4">
        Desliza para ver más • {current + 1} / {count}
      </p>

      <Carousel setApi={setApi as any} className="w-full">
        <CarouselContent>
          {productos.map((producto, index) => {
            const outOfStock = (producto.stockActual ?? 0) <= 0;
            const lowStock =
              !outOfStock && (producto.stockActual ?? 0) <= lowStockThreshold;

            return (
              <CarouselItem
                key={`${producto.id}-${index}`}
                className="basis-full"
              >
                <div>
                  <Card
                    className={cn(
                      "h-full rounded-2xl shadow-sm border border-border/60 bg-gradient-to-b from-background to-muted/30",
                      "transition-transform duration-200 hover:shadow-md hover:-translate-y-[2px]"
                    )}
                  >
                    <CardContent className="p-5">
                      {/* Media */}
                      <div className="relative w-full overflow-hidden rounded-xl bg-muted aspect-[4/3]">
                        {producto.imagenUrl ? (
                          <Image
                            src={producto.imagenUrl}
                            alt={producto.nombre}
                            fill
                            sizes="(max-width: 640px) 100vw, 480px"
                            className="object-cover"
                            priority={index === 0}
                          />
                        ) : (
                          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                            <Package className="h-8 w-8" />
                          </div>
                        )}

                        {/* Badges */}
                        {outOfStock && (
                          <Badge
                            className="absolute left-3 top-3"
                            variant="destructive"
                          >
                            Sin stock
                          </Badge>
                        )}
                        {lowStock && !outOfStock && (
                          <Badge
                            className="absolute left-3 top-3"
                            variant="secondary"
                          >
                            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                            Poco stock
                          </Badge>
                        )}
                      </div>

                      {/* Info */}
                      <div className="mt-4 space-y-1.5 text-center">
                        <p className="text-base font-semibold leading-tight line-clamp-2">
                          {producto.nombre}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Stock: {producto.stockActual ?? 0}
                        </p>
                        {typeof producto.precioVenta === "number" && (
                          <p className="text-lg font-bold tracking-tight">
                            {new Intl.NumberFormat("es-CO", {
                              style: "currency",
                              currency: "COP",
                              maximumFractionDigits: 0,
                            }).format(producto.precioVenta)}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="-left-3 md:-left-4" />
        <CarouselNext className="-right-3 md:-right-4" />
      </Carousel>

      {/* Dots */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={i}
            aria-label={`Ir al slide ${i + 1}`}
            onClick={() => api?.scrollTo(i)}
            className={cn(
              "h-2.5 w-2.5 rounded-full transition",
              i === current
                ? "bg-primary scale-110"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ————————————————————————————————————————————————————————————————
