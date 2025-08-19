"use client";

import React from "react";
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

export function CarrouselProducts({
  productos,
  titulo,
}: {
  productos: ProductCarrousel[];
  titulo: string;
}) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  if (!productos || productos.length === 0) {
    return (
      <p className="text-center text-muted-foreground">No hay productos.</p>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-2">
      <h2 className="text-center text-xl font-bold text-primary mb-4 text-balance">
        {titulo}
      </h2>

      <Carousel setApi={setApi} className="w-full">
        <CarouselContent>
          {productos.map((producto, index) => (
            <CarouselItem
              key={`${producto.id}-${index}`}
              className="basis-full"
            >
              <Card className="h-full shadow-lg border-none rounded-2xl transition hover:scale-[1.01]">
                <CardContent className="flex flex-col items-center justify-between p-6 space-y-4 min-h-[380px]">
                  <div className="w-full h-48 overflow-hidden rounded-xl bg-gray-100">
                    <img
                      src={producto.imagenUrl}
                      alt={producto.nombre}
                      className="w-full h-full object-cover transition duration-300 ease-in-out hover:scale-105"
                    />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-lg font-semibold text-foreground">
                      {producto.nombre}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Stock: {producto.stockActual}
                    </p>
                    <p className="text-base font-bold text-green-600">
                      $ {producto.precioVenta.toLocaleString("es-CO")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>

      <div className="text-muted-foreground py-2 text-center text-sm">
        Slide {current} de {count}
      </div>
    </div>
  );
}
