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
  {
    icon: CreditCard,
    label: "Compras",
    href: "/compras",
  }
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

export const dataInventarioSideBar = [
  {
    icon: Package,
    label: "Inventario",
    href: "/inventario",
  },
];

export const dataToolsSideBar = [
  {
    icon: TrendingUp,
    label: "Estadísticas",
    href: "/estadisticas",
  },
];

export const dataClienteSideBar = [
  {
    icon: Users,
    label: "Clientes",
    href: "/clientes",
  },
];

export const dataSupportSideBar = [
  {
    icon: Settings,
    label: "Administración",
    href: "/admin",
  },
];
