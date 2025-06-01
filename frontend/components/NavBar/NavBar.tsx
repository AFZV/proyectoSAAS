import { Input } from "@/components/ui/input";
import { SheetContent, Sheet, SheetTrigger } from "@/components/ui/sheet";
import { UserButton } from "@clerk/nextjs";
import { Menu, Search } from "lucide-react";
import { SideBarRoutes } from "../SideBarRoutes";
import { ToogleTheme } from "../ToogleTheme";

export function NavBar() {
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
          <SheetContent side="left">
            <SideBarRoutes />
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
