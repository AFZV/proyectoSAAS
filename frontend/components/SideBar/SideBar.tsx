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
  const rol = usuario.rol as string;
  
  return (
    <div className="h-screen overflow-hidden">
      <div className="h-full flex flex-col bg-card border-r shadow-sm">
        {/* Header con Logo */}
        <div className="border-b bg-card">
          <Logo logoUrl={usuario.logoUrl} empresaName={usuario.nombreEmpresa} />
        </div>
        
        {/* Navegación - Con scroll interno */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          <SideBarRoutes rol={rol} />
        </div>
      </div>
    </div>
  );
}