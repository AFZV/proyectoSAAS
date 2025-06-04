import { NavBar } from "@/components/NavBar";
import { SideBar } from "@/components/SideBar";

export default function LayoutDashBoard({
  children,
}: {
  children: React.ReactElement;
}) {
  return (
    <div className="flex w-full min-h-screen bg-background text-foreground">
      <div className="hidden xl:block w-80 h-full xl:fixed">
        <SideBar />
      </div>
      <div className="w-full xl:ml-80">
        <NavBar />
        <main className="p-6 min-h-screen">{children}</main>
      </div>
    </div>
  );
}
