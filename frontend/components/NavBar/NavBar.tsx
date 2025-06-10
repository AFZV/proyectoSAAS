import { Input } from "@/components/ui/input";
import { SheetContent, Sheet, SheetTrigger } from "@/components/ui/sheet";
import { UserButton } from "@clerk/nextjs";
import { Menu, Bell } from "lucide-react";
import { SideBarRoutes } from "../SideBarRoutes";
import { ToogleTheme } from "../ToogleTheme";
import { getToken } from "@/lib/getToken";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

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
    <nav className="flex items-center px-2 gap-x-4 md:px-6 w-full bg-background border-b h-20">

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
      <div className="flex items-center gap-x-3 ml-auto">

        {/* Notificaciones */}
        <Button variant="ghost" size="icon" className="hover:bg-muted relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            2
          </span>
        </Button>

        <ToogleTheme />

        {/* ✅ UserButton simple con solo la configuración esencial */}
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </nav>
  );
}