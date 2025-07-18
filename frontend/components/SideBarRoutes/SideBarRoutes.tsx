"use client";
import {
  dataClienteSideBar,
  dataCuentasPorCobrarSideBar,
  dataFacturacionSidebar,
  dataGeneralSideBar,
  dataHerramientasSideBar,
  dataInventarioSideBar,
  dataSupportSideBar,
  dataToolsSideBar,
} from "./SideBar.data";
import { SideBarItem } from "../SideBarItem";
import { Package } from "lucide-react";

export function SideBarRoutes({ rol }: { rol: string }) {
  if (rol === "temporal") {
    return (
      <div className="flex flex-col h-full px-4 py-6">
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
            Catálogo
          </h3>
          <nav className="space-y-1">
            <SideBarItem
              item={{
                label: "Catálogo",
                href: "/catalog",
                icon: Package, // asegúrate de que este icono esté soportado en tu componente
              }}
              key="1"
            />
          </nav>
        </div>
      </div>
    );
  }

  // --- Resto del sidebar para roles distintos a "temporal" ---
  return (
    <div className="flex flex-col h-full">
      {/* General */}
      <div className="flex-1 px-4 py-6 space-y-8">
        {/* Secciones normales */}
        {/* General */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
            General
          </h3>
          <nav className="space-y-1">
            {dataGeneralSideBar.map((item) => (
              <SideBarItem key={item.label} item={item} />
            ))}
          </nav>
        </div>

        {/* Facturación */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
            Facturación
          </h3>
          <nav className="space-y-1">
            {dataFacturacionSidebar.map((item) => (
              <SideBarItem key={item.label} item={item} />
            ))}
          </nav>
        </div>

        {/* Cuentas por Cobrar */}
        {(rol === "admin" || rol === "vendedor") && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
              Cuentas Por Cobrar
            </h3>
            <nav className="space-y-1">
              {dataCuentasPorCobrarSideBar
                .filter(
                  (item) => !(item.label === "Cartera" && rol !== "admin")
                )
                .map((item) => (
                  <SideBarItem key={item.label} item={item} />
                ))}
            </nav>
          </div>
        )}

        {/* Inventario */}
        {rol === "admin" && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
              Inventario
            </h3>
            <nav className="space-y-1">
              {dataInventarioSideBar.map((item) => (
                <SideBarItem key={item.label} item={item} />
              ))}
            </nav>
          </div>
        )}

        {/* Clientes */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
            Clientes
          </h3>
          <nav className="space-y-1">
            {dataClienteSideBar
              .filter(
                (item) => !(item.label === "Proveedores" && rol !== "admin")
              )
              .map((item) => (
                <SideBarItem key={item.label} item={item} />
              ))}
          </nav>
        </div>

        {/* Análisis */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
            Análisis
          </h3>
          <nav className="space-y-1">
            {dataToolsSideBar.map((item) => {
              if (
                (item.label === "Reportes" || item.href === "/reportes") &&
                rol !== "admin"
              ) {
                return null;
              }
              return <SideBarItem key={item.label} item={item} />;
            })}
          </nav>
        </div>

        {/* Administración */}
        {rol === "superadmin" && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
              Administración
            </h3>
            <nav className="space-y-1">
              {dataSupportSideBar.map((item) => (
                <SideBarItem key={item.label} item={item} />
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* Herramientas Avanzadas */}
      {rol === "admin" && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
            Herramientas Avanzadas
          </h3>
          <nav className="space-y-1">
            {dataHerramientasSideBar.map((item) => (
              <SideBarItem key={item.label} item={item} />
            ))}
          </nav>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-4 border-t bg-muted/30">
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold text-foreground">Softverse</p>
          <p className="text-xs text-muted-foreground">
            © 2025 • Software registrado
          </p>
        </div>
      </div>
    </div>
  );
}
