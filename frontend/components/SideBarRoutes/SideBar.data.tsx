"use client";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  FolderOpen,
  Settings,
  TrendingUp,
  Wallet,
  BanknoteIcon,
  WarehouseIcon,
  DownloadCloud,
  UploadCloud,
  FileBarChart,
  FileUp,
} from "lucide-react";

export const dataGeneralSideBar = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/",
  },
];

export const dataFacturacionSidebar = [
  {
    icon: ShoppingCart,
    label: "Pedidos",
    href: "/invoices",
  },
  {
    icon: FolderOpen,
    label: "Catálogo",
    href: "/catalog",
  },
];

export const dataCuentasPorCobrarSideBar = [
  {
    icon: Wallet,
    label: "Recaudos",
    href: "/recaudos",
  },
  {
    icon: BanknoteIcon,
    label: "Cartera",
    href: "/cartera",
  },
];

export const dataCuentasPorPagarSideBar = [
  {
    icon: CreditCard,
    label: "Pagos",
    href: "/pagos",
  },
];

export const dataInventarioSideBar = [
  {
    icon: Package,
    label: "Inventario",
    href: "/inventario",
  },
  {
    icon: CreditCard,
    label: "Compras",
    href: "/compras",
  },
];

export const dataToolsSideBar = [
  {
    icon: TrendingUp,
    label: "Estadísticas",
    href: "/estadisticas",
  },
  {
    icon: FileBarChart,
    label: "Reportes",
    href: "/reportes",
  },
];

export const dataClienteSideBar = [
  {
    icon: Users,
    label: "Clientes",
    href: "/clientes",
  },
  {
    icon: WarehouseIcon,
    label: "Proveedores",
    href: "/proveedores",
  },
];

export const dataHerramientasSideBar = [
  {
    icon: DownloadCloud,
    label: "Respaldos",
    href: "/respaldos",
  },
  {
    icon: FileUp,
    label: "Importar",
    href: "/importar",
  },
];

export const dataSupportSideBar = [
  {
    icon: Settings,
    label: "Administración",
    href: "/admin",
  },
];
