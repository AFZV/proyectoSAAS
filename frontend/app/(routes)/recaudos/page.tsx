import { ro } from "date-fns/locale";
import { HeaderCartera } from "../cartera/components/HeaderCartera";
import { HeaderRecaudos } from "./(components)/HeaderRecaudos";
import { ListRecaudos } from "./(components)/ListRecaudos";
import NoDisponible from "@/components/NoDisponible/NoDisponible";
import { getToken } from "@/lib/getToken";

export default async function RecaudosPage() {
  const token = await getToken();

  if (!token) return <NoDisponible />;

  const userRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/usuario-actual`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  if (!userRes.ok) {
    return <NoDisponible />;
  }

  const usuario = await userRes.json();
  const rol = usuario.rol; // ← aquí sí tienes acceso a `rol`

  // Obtener recibos
  const dataRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/recibos/all`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await dataRes.json();

  // Obtener stats
  const statsRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/recibos/getStats/summary`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const stats = await statsRes.json();
  console.log("debugPedidos desde backend:", stats.debugPedidos);

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-6">
      <HeaderRecaudos rol={rol} stats={stats} />
      <ListRecaudos data={data} />
    </div>
  );
}
