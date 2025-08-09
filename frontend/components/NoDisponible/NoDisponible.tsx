import React from "react";
import { Button } from "../ui/button";
import Link from "next/link";

export default function NoDisponible() {
  return (
    <div className="flex flex-col justify-center items-center h-40">
      No Disponible para su rol
      <Button>
        <Link href="/catalog">Ir a Catalogo</Link>
      </Button>
    </div>
  );
}
