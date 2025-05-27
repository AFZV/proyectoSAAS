import {
  BarChart4,
  Building2,
  PanelsTopLeft,
  Settings,
  Calendar,
  ShieldCheck,
  NotebookPenIcon,
  ContactRound,
  FolderArchiveIcon,
  FolderIcon,
  ShieldUserIcon,
} from "lucide-react";

export const dataGeneralSideBar = [
  {
    icon: PanelsTopLeft,
    label: "Dashboard",
    href: "/",
  },

  {
    icon: Building2,
    label: "Recaudos",
    href: "/recaudos",
  },
  {
    icon: Calendar,
    label: "Calendario",
    href: "/calendar",
  },
  {
    icon: NotebookPenIcon,
    label: "Pedidos",
    href: "/invoices",
  },
  {
    icon: ContactRound,
    label: "Clientes",
    href: "/clientes",
  },
  {
    icon: FolderIcon,
    label: "Catalogo",
    href: "/catalog",
  },
];

export const dataToolsSideBar = [
  {
    icon: BarChart4,
    label: "Estadísticas",
    href: "/analitycs",
  },
];

export const dataSupportSideBar = [
  {
    icon: Settings,
    label: "Ajustes",
    href: "/settings",
  },

  {
    icon: ShieldCheck,
    label: "Seguridad",
    href: "/security",
  },

  {
    icon: ShieldUserIcon,
    label: "Administracion",
    href: "admin",
  },
];
