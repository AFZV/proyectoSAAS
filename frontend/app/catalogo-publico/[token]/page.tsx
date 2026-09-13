// app/catalogo-publico/[token]/page.tsx
// Página PÚBLICA (sin login) — accesible por cualquiera con el link firmado.
import { PublicCatalogClient } from "./PublicCatalogClient";
import type { CatalogoPublicoResponse } from "../../(routes)/catalog/types/catalog.types";

export default async function CatalogoPublicoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let data: CatalogoPublicoResponse | null = null;
  let error: string | null = null;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/public/catalogo/${token}`,
      { cache: "no-store" },
    );

    if (!res.ok) {
      error =
        res.status === 404
          ? "Este enlace no es válido o ya expiró."
          : "No se pudo cargar el catálogo. Inténtalo de nuevo más tarde.";
    } else {
      data = await res.json();
    }
  } catch {
    error = "No se pudo cargar el catálogo. Inténtalo de nuevo más tarde.";
  }

  if (!data || error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
        <div className="text-center space-y-3 max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-2xl">
            ⏳
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Enlace no disponible
          </h2>
          <p className="text-slate-600">
            {error ?? "Este enlace no es válido o ya expiró."}
          </p>
          <p className="text-sm text-slate-400">
            Pídele a quien te lo compartió que genere uno nuevo.
          </p>
        </div>
      </div>
    );
  }

  return <PublicCatalogClient data={data} />;
}
