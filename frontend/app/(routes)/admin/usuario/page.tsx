"use client";
import { HeaderPanels } from "@/components/HeaderPanels";
import React from "react";
import { FormCrearUsuario } from "../components/FormCrearUsuario/FormCrearUsuario";
import { UsuarioTable } from "./UsuarioTable";

export default function usuariosPage() {
  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Gestión de Usuarios</h1>
      <UsuarioTable />
    </div>
  );
}
