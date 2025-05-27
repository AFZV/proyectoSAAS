"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ListProducts } from "../ListProducts";
import { ProductProps } from "@/components/CardProduct/CardProduct.type";
import {
  AlarmClockIcon,
  ForkKnife,
  ScissorsIcon,
  WrenchIcon,
} from "lucide-react";

export function CatalogClientWrapper({
  productos,
}: {
  productos: ProductProps[];
}) {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<
    string | null
  >(null);

  return (
    <div>
      <div className="flex justify-between gap-2 mb-4">
        <Button onClick={() => setCategoriaSeleccionada("papeleria")}>
          PAPELERIA
          <ScissorsIcon />
        </Button>
        <Button onClick={() => setCategoriaSeleccionada("ferreteria")}>
          FERRETERIA
          <WrenchIcon />
        </Button>
        <Button onClick={() => setCategoriaSeleccionada("hogar")}>
          HOGAR
          <ForkKnife />
        </Button>
        <Button onClick={() => setCategoriaSeleccionada("cacharro")}>
          CACHARRO
          <AlarmClockIcon />
        </Button>
        <Button
          variant="outline"
          onClick={() => setCategoriaSeleccionada(null)}
        >
          TODOS
        </Button>
      </div>
      <Separator />
      <ListProducts
        productos={productos}
        categoria={categoriaSeleccionada ?? ""}
      />
    </div>
  );
}
