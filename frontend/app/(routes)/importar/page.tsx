import React from "react";
import { CargarProductos } from "./components/CargarProductos";
import { CargarInventario } from "./components/CargarInventario";

export default function Page() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      <CargarProductos />
      <CargarInventario />
    </div>
  );
}
