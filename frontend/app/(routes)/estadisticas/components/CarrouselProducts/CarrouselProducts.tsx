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
    <div className="w-full max-w-md mx-auto">
      <h2 className="text-center text-lg font-semibold mb-4">{titulo}</h2>

      <Carousel setApi={setApi} className="w-full">
        <CarouselContent>
          {productos.map((producto) => (
            <CarouselItem key={producto.id} className="basis-full">
              <Card className="h-full">
                <CardContent className="flex flex-col items-center justify-center p-6 space-y-4 min-h-[360px]">
                  <div className="w-full h-full overflow-hidden rounded-md">
                    <img
                      src={producto.imagenUrl}
                      alt={producto.nombre}
                      className="w-full h-full object-cover "
                    />
                  </div>
                  <p className="text-base font-semibold text-center">
                    {producto.nombre}
                  </p>
                  <p className="text-sm text-gray-700">
                    Stock: {producto.stockActual}
                  </p>
                  <p className="text-base text-green-700 font-medium">
                    Precio Compra $
                    {producto.precioCompra.toLocaleString("es-CO")}
                  </p>
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
