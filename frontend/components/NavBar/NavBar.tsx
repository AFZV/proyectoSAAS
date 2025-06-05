import { Input } from "@/components/ui/input";
import { SheetContent, Sheet, SheetTrigger } from "@/components/ui/sheet";
import { UserButton } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import { SideBarRoutes } from "../SideBarRoutes";
import { ToogleTheme } from "../ToogleTheme";
import { getToken } from "@/lib/getToken";
import { redirect } from "next/navigation";

export async function NavBar() {
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
    <nav
      className="flex items-center 
      px-2 gap-x-4 md:px-6 
      w-full bg-background border-b h-20"
    >
      {/* Menú lateral (solo visible en pantallas pequeñas) */}
      <div className="block xl:hidden">
        <Sheet>
          <SheetTrigger className="flex items-center">
            <Menu />
          </SheetTrigger>

          {/* ✅ Scroll vertical dentro del sidebar en móviles */}
          <SheetContent side="left" className="h-full overflow-y-auto p-0">
            <SideBarRoutes rol={rol} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Empuja lo siguiente a la derecha */}
      <div className="flex items-center gap-x-2 ml-auto">
        <ToogleTheme />
        <UserButton />
      </div>
    </nav>
  );
}
