"use client";
import React from "react";
import {
  dataGeneralSideBar,
  dataSupportSideBar,
  dataToolsSideBar,
} from "./SideBar.data";
import { SideBarItem } from "../SideBarItem";
import { Separator } from "@/components/ui/separator";
import { Button } from "../ui/button";
export function SideBarRoutes() {
  return (
    <div className="flex flex-col justify-between h-full">
      <div>
        <div className="p-2 md:p-4">
          <p>GENERAL</p>
          {dataGeneralSideBar.map((item) => (
            <SideBarItem key={item.label} item={item} />
          ))}
        </div>
        <Separator />
        <div className="p-2 md:p-4">
          <p>ESTADÍSTICAS</p>
          {dataToolsSideBar.map((item) => (
            <SideBarItem key={item.label} item={item} />
          ))}
        </div>

        <Separator />

        <div className="p-2 md:p-4">
          <p>SOPORTE</p>
          {dataSupportSideBar.map((item) => (
            <SideBarItem key={item.label} item={item} />
          ))}
        </div>
      </div>
      <Separator />

      <div>
        <div className="text-center p-4">
          <Button variant="outline" className="w-full">
            MEJORAR PLAN
          </Button>
        </div>
        <Separator />
        <footer className="mt-3 p-3 text-center">
          2025 Desarrollado por Alexis Zuluaga
        </footer>
      </div>
    </div>
  );
}
