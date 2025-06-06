import React from "react";
import { EmpresaModulo } from "./components/EmpresaModulo";
import { UsuarioModulo } from "./components/UsuarioModulo";

export default function AdminPage() {
  return (
    <div>
      <EmpresaModulo />
      <UsuarioModulo />
    </div>
  );
}
