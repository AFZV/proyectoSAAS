import { auth } from "@clerk/nextjs";
import { Logo } from "../Logo";
import { SideBarRoutes } from "../SideBarRoutes";
import { redirect } from "next/navigation";

export async function SideBar() {
  const { userId } = auth();

  if (!userId) redirect("/sign-in");

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/usuario-actual`,
    {
      headers: { Authorization: userId },
      cache: "no-store",
    }
  );

  const usuario = await res.json();
  return (
    <div className="h-screen overflow-y-auto">
      <div className="h-full flex flex-col border-r">
        <Logo logoUrl={usuario.logoUrl} empresaName={usuario.nombreEmpresa} />
        <SideBarRoutes />
      </div>
    </div>
  );
}
