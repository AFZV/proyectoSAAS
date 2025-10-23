"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, ShoppingCart } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export type MenuItem = {
  label: string;
  href: string;
  description?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

import {
  dataClienteSideBar,
  dataCuentasPorCobrarSideBar,
  dataFacturacionSidebar,
  dataGeneralSideBar,
  dataHerramientasSideBar,
  dataInventarioSideBar,
  dataSupportSideBar,
  dataToolsSideBar,
  dataCuentasPorPagarSideBar,
} from "./SideBar.data";

export function SideBarRoutes({ rol }: { rol: string }) {
  const pathname = usePathname();

  const general = [...dataGeneralSideBar];
  const facturacion = [...dataFacturacionSidebar];
  const cxc =
    rol === "admin" || rol === "vendedor"
      ? dataCuentasPorCobrarSideBar.filter(
          (item) => !(item.label === "Cartera" && rol !== "admin")
        )
      : [];
  const inventario = rol === "admin" ? [...dataInventarioSideBar] : [];
  const clientes = dataClienteSideBar.filter(
    (item) => !(item.label === "Proveedores" && rol !== "admin")
  );
  const analisis = dataToolsSideBar.filter((item) => {
    if (
      (item.label === "Reportes" || item.href === "/reportes") &&
      rol !== "admin"
    )
      return false;
    return true;
  });
  const admin = rol === "superadmin" ? [...dataSupportSideBar] : [];
  const herramientas = rol === "admin" ? [...dataHerramientasSideBar] : [];
  const pagos = rol === "admin" ? [...dataCuentasPorPagarSideBar] : [];

  // Vista para clientes (rol CLIENTE)
  if (rol === "CLIENTE") {
    return (
      <aside className="w-full h-full flex flex-col border-r bg-background">
        <div className="flex-1 overflow-y-auto">
          <div className="p-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Menú Cliente
            </div>
            <nav className="flex flex-col gap-1">
              <NavLink href="/catalog" icon={Package} activePath={pathname}>
                Catálogo
              </NavLink>
              <NavLink
                href="/invoices"
                icon={ShoppingCart}
                activePath={pathname}
              >
                Mis Pedidos
              </NavLink>
            </nav>
          </div>
        </div>
        <FooterBrand />
      </aside>
    );
  }

  // Vista temporal (sin autenticación completa)
  if (rol === "temporal") {
    return (
      <aside className="w-60 h-full flex flex-col border-r bg-background">
        <div className="p-3 text-xs font-semibold text-muted-foreground">
          Catálogo
        </div>
        <nav className="px-2 pb-3">
          <NavLink href="/catalog" icon={Package} activePath={pathname}>
            Catálogo
          </NavLink>
        </nav>
        <FooterBrand />
      </aside>
    );
  }

  return (
    <aside className="w-full h-full flex flex-col border-r bg-background">
      <div className="flex-1 overflow-y-auto">
        <Accordion
          type="multiple"
          defaultValue={[
            "general",
            "facturacion",
            "clientes",
            "cuentas-por-cobrar",
          ]}
          className="w-full px-2"
        >
          <Section title="General" items={general} activePath={pathname} />
          <Section
            title="Facturación"
            items={facturacion}
            activePath={pathname}
          />
          {cxc.length > 0 && (
            <Section
              title="Cuentas por Cobrar"
              items={cxc}
              activePath={pathname}
            />
          )}
          {inventario.length > 0 && (
            <Section
              title="Inventario"
              items={inventario}
              activePath={pathname}
            />
          )}
          <Section title="Clientes" items={clientes} activePath={pathname} />
          <Section title="Análisis" items={analisis} activePath={pathname} />
          {admin.length > 0 && (
            <Section
              title="Administración"
              items={admin}
              activePath={pathname}
            />
          )}
          {pagos.length > 0 && (
            <Section
              title="Cuentas por Pagar"
              items={pagos}
              activePath={pathname}
            />
          )}
          {herramientas.length > 0 && (
            <Section
              title="Herramientas Avanzadas"
              items={herramientas}
              activePath={pathname}
            />
          )}
        </Accordion>
      </div>
      <FooterBrand />
    </aside>
  );
}

function Section({
  title,
  items,
  activePath,
}: {
  title: string;
  items: MenuItem[];
  activePath: string;
}) {
  const slug = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // quita acentos
      .toLowerCase()
      .replace(/\s+/g, "-");
  if (!items?.length) return null;
  const value = slug(title);
  return (
    <AccordionItem value={value} className="border-none">
      <AccordionTrigger className="text-xs px-2 py-2 rounded-md hover:no-underline">
        <span className="font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <ul className="flex flex-col gap-1 pb-2">
          {items.map((it) => (
            <li key={`${title}-${it.label}`}>
              <NavLink href={it.href} icon={it.icon} activePath={activePath}>
                {it.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </AccordionContent>
    </AccordionItem>
  );
}

function NavLink({
  href,
  children,
  icon: Icon,
  activePath,
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  activePath: string;
}) {
  const active = activePath === href;
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
        "hover:bg-muted transition-colors",
        active ? "bg-muted text-foreground" : "text-muted-foreground"
      )}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      <span>{children}</span>
    </Link>
  );
}

function FooterBrand() {
  return (
    <div className="px-4 py-3 border-t bg-muted/30">
      <div className="text-center space-y-1">
        <p className="text-xs font-semibold text-foreground">Softverse</p>
        <p className="text-xs text-muted-foreground">
          © 2025 • Software registrado
        </p>
      </div>
    </div>
  );
}
