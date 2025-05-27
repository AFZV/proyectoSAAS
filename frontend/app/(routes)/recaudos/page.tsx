import { HeaderRecaudos } from "./(components)/HeaderRecaudos";
import { ListRecaudos } from "./(components)/ListRecaudos";
import { auth } from "@clerk/nextjs/server";
import NoDisponible from "@/components/NoDisponible/NoDisponible";

export default async function RecaudosPage() {
  const { userId } = auth();

  if (!userId) return <NoDisponible />;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/usuario/con-empresa`,
    {
      headers: {
        Authorization: userId,
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

  if (!usuario || !usuario.empresaId) {
    return <NoDisponible />;
  }

  return (
    <div>
      <HeaderRecaudos user={usuario.rol} />
      <ListRecaudos />
    </div>
  );
}
