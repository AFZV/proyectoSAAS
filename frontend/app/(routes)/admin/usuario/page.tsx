import { getToken } from "@/lib/getToken";
import { HeaderUsuario } from "./components/HeaderUsuario";
import ListUsuariosPage from "./components/ListUsuarios/ListUsuarios";
import { redirect } from "next/navigation";

export default async function usuariosPage() {
  const token = await getToken();
  const userLogged = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/superadmin`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!userLogged.ok) {
    redirect("/");
  }
  const usuario = await userLogged.json();

  const rol = usuario.rol;
  const superadmin = rol === "superadmin" ? rol : null;
  return (
    superadmin && (
      <div className="p-4 max-w-6xl mx-auto">
        <HeaderUsuario />
        <ListUsuariosPage />
      </div>
    )
  );
}
