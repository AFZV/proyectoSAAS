import { HeaderRecaudos } from "./(components)/HeaderRecaudos";
import { ListRecaudos } from "./(components)/ListRecaudos";
import { auth } from "@clerk/nextjs/server";
import NoDisponible from "@/components/NoDisponible/NoDisponible";
import { getToken } from "@/lib/getToken";

export default async function RecaudosPage() {
  const token = await getToken();

  if (!token) return <NoDisponible />;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/usuario-actual`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    console.error("❌ Error en la respuesta del backend");
    return <NoDisponible />;
  }

  let usuario;
  try {
    usuario = await res.json();
  } catch (err) {
    console.error("❌ Error al parsear JSON:", err);
    return <NoDisponible />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-6">
      <HeaderRecaudos user={usuario.rol} />
      <ListRecaudos />
    </div>
  );
}
