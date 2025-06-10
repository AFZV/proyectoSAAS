"use client";
import Link from "next/link";
import { SideBarItemProps } from "./SideBarItem.types";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";

export function SideBarItem(props: SideBarItemProps) {
  const { item } = props;
  const { href, icon: Icon, label } = item;
  const pathName = usePathname();
  const router = useRouter();
  const activePath = pathName === href;

  // ✅ Manejar navegación explícitamente
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(href);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:scale-[1.02] w-full text-left",
        activePath
          ? "bg-blue-600 text-white shadow-md"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 transition-colors duration-200",
          activePath ? "text-white" : "text-muted-foreground group-hover:text-accent-foreground"
        )}
        strokeWidth={1.5}
      />
      <span className="truncate">{label}</span>

      {/* ✅ Punto blanco indicador */}
      {activePath && (
        <div className="ml-auto h-2 w-2 rounded-full bg-white/90" />
      )}
    </button>
  );
}