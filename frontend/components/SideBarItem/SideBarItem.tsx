"use client";
import { SideBarItemProps } from "./SideBarItem.types";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export function SideBarItem(props: SideBarItemProps) {
  const { item } = props;
  const { href, icon: Icon, label } = item;
  const pathName = usePathname();
  const router = useRouter();
  const activePath = pathName === href;
  const [isPending, setIsPending] = useState(false);

  // Cuando la ruta cambia, limpia el estado de carga
  useEffect(() => {
    setIsPending(false);
  }, [pathName]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (activePath) return;
    setIsPending(true);
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
          "h-4 w-4 transition-colors duration-200 shrink-0",
          activePath ? "text-white" : "text-muted-foreground group-hover:text-accent-foreground"
        )}
        strokeWidth={1.5}
      />
      <span className="truncate">{label}</span>

      <div className="ml-auto shrink-0">
        {isPending && !activePath ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin opacity-70" />
        ) : activePath ? (
          <div className="h-2 w-2 rounded-full bg-white/90" />
        ) : null}
      </div>
    </button>
  );
}
