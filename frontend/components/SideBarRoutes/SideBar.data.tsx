import {
  BarChart4,
  Building2,
  PanelsTopLeft,
  Settings,
  Calendar,
  ShieldCheck,
  NotebookPenIcon,
  ContactRound,
  FolderIcon,
  ShieldUserIcon,
  BoxesIcon,
} from "lucide-react";

export const dataFacturacionSidebar = [
  {
    icon: NotebookPenIcon,
    label: "Pedidos",
    href: "/invoices",
  },
  {
    icon: FolderIcon,
    label: "Catalogo",
    href: "/catalog",
  },
];

export const dataGeneralSideBar = [
  {
    icon: PanelsTopLeft,
    label: "Principal",
    href: "/",
  },

  // {
  //   icon: Calendar,
  //   label: "Calendario",
  //   href: "/calendar",
  // },
];

export const dataCuentasPorCobrarSideBar = [
  {
    icon: Building2,
    label: "Recaudos",
    href: "/recaudos",
  },
];
export const dataInventarioSideBar = [
  { icon: BoxesIcon, label: "Inventario", href: "/inventario" },
];

export const dataToolsSideBar = [
  {
    icon: BarChart4,
    label: "Estadísticas",
    href: "/analitycs",
  },
];

export const dataClienteSideBar = [
  {
    icon: ContactRound,
    label: "Clientes",
    href: "/clientes",
  },
];

export const dataSupportSideBar = [
  // {
  //   icon: Settings,
  //   label: "Ajustes",
  //   href: "/settings",
  // },

  // {
  //   icon: ShieldCheck,
  //   label: "Seguridad",
  //   href: "/security",
  // },

  {
    icon: ShieldUserIcon,
    label: "Administracion",
    href: "admin",
  },
];
