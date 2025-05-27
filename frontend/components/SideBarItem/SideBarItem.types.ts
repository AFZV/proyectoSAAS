import { LucideIcon } from "lucide-react";

export type SideBarItemProps = {
  item: {
    label: string;
    icon: LucideIcon;
    href: string;
  };
  key: string;
};
