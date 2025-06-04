import { Logo } from "../Logo";
import { SideBarRoutes } from "../SideBarRoutes";
import { redirect } from "next/navigation";
import { getToken } from "@/lib/getToken";

export async function SideBar() {
  const token = await getToken();

  if (!token) redirect("/sign-in");

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/usuario-actual`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );

  const usuario = await res.json();
  console.log("usuario en sidebar:", usuario);
  return (
    <div className="h-screen overflow-y-auto">
      <div className="h-full flex flex-col border-r">
        <Logo logoUrl={usuario.logoUrl} empresaName={usuario.nombreEmpresa} />
        <SideBarRoutes />
      </div>
    </div>
  );
}
