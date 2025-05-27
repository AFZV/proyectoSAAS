import { NavBar } from "@/components/NavBar";
import { SideBar } from "@/components/SideBar";

export default function LayoutDashBoard({
  children,
}: {
  children: React.ReactElement;
}) {
  return (
    <div className="flex w-full h-full">
      <div className="hidden xl:block w-80 h-full xl:fixed">
        <SideBar />
      </div>
      <div className="w-full xl:ml-80">
        <NavBar />
        <div className="p-6 bg-[#fafbfc] dark:bg-secondart">{children}</div>
      </div>
    </div>
  );
}
