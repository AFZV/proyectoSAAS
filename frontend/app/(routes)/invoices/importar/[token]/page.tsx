// app/(routes)/invoices/importar/[token]/page.tsx
// Pantalla PROTEGIDA (Clerk, admin/vendedor): revisar y confirmar un carrito armado en el
// catálogo público que llegó por WhatsApp, antes de crearlo como pedido real.
import { getToken } from "@/lib/getToken";
import { ImportarPedidoClient } from "./ImportarPedidoClient";
import type { ItemPedidoImportado } from "./importar.types";

export default async function ImportarPedidoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const authToken = await getToken();

  let items: ItemPedidoImportado[] | null = null;
  let observacionGeneral = "";
  let error: string | null = null;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/pedidos/importar/${token}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      error =
        body?.message ||
        (res.status === 401
          ? "Este enlace pertenece a otra empresa."
          : "Este enlace no es válido o ya expiró.");
    } else {
      const data = await res.json();
      items = data.items;
      observacionGeneral = data.observacionGeneral ?? "";
    }
  } catch {
    error = "No se pudo cargar el pedido. Inténtalo de nuevo más tarde.";
  }

  if (!items || error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center space-y-3 max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-2xl">
            ⏳
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            No se pudo importar el pedido
          </h2>
          <p className="text-slate-600">
            {error ?? "Este enlace no es válido o ya expiró."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ImportarPedidoClient
      itemsIniciales={items}
      observacionGeneralInicial={observacionGeneral}
      token={token}
    />
  );
}
