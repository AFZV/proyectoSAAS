import HeaderCliente from "./components/HeaderCliente/HeaderCliente";
import ListClientsPage from "./components/ListClientes/ListClients";
import { getToken } from "@/lib/getToken";

export default async function ClientesPage() {
  const token = await getToken();
  let rol = "vendedor";

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/usuario-actual`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    if (res.ok) {
      const usuario = await res.json();
      rol = usuario.rol ?? "vendedor";
    }
  } catch {}

  return (
    <div className="min-h-screen bg-background">
      <HeaderCliente />
      <div className="pb-6">
        <ListClientsPage rol={rol} />
      </div>
    </div>
  );
}