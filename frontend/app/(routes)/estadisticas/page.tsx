// File: app/(dashboard)/estadisticas/page.tsx
import { Suspense } from "react";
import { CarrouselProducts } from "./components/CarrouselProducts";
import { getToken } from "@/lib/getToken";
import { InactiveClients } from "./components/InactiveClients/InactiveClients";
import { HeaderEstadisticas } from "./components/HeaderEstadisticas";
import { Card, CardContent } from "@/components/ui/card";

async function fetchStats(token: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/estadisticas/stats`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-cache",
    }
  );
  if (!res.ok) throw new Error("NO TIENE ACCESO");
  return res.json();
}

export default async function EstadisticasPage() {
  const token = await getToken();
  let data: any;
  try {
    data = await fetchStats(token);
  } catch (e) {
    return (
      <div className="px-5 py-10 max-w-6xl mx-auto">
        <HeaderEstadisticas />
        <Card className="mt-6 border-destructive/40">
          <CardContent className="py-10 text-center text-destructive">
            NO TIENE ACCESO
          </CardContent>
        </Card>
      </div>
    );
  }

  const productsLow = data?.ProductsLowStock ?? [];
  const products = data?.productos ?? [];
  const clientesInactivos = data?.clientes ?? [];

  return (
    <div className="flex flex-col gap-6 px-5 py-6 max-w-6xl mx-auto">
      <HeaderEstadisticas />

      {/* Carruseles */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Suspense
          fallback={
            <Card>
              <CardContent className="p-10">Cargando…</CardContent>
            </Card>
          }
        >
          <CarrouselProducts
            productos={productsLow}
            titulo="Productos con poco stock"
          />
        </Suspense>

        <Suspense
          fallback={
            <Card>
              <CardContent className="p-10">Cargando…</CardContent>
            </Card>
          }
        >
          <CarrouselProducts
            productos={products}
            titulo="Productos con baja rotación"
          />
        </Suspense>
      </section>

      {/* Clientes inactivos */}
      <section>
        <InactiveClients clientes={clientesInactivos} />
      </section>
    </div>
  );
}
