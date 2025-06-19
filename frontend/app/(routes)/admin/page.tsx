import React from "react";
import { EmpresaModulo } from "./empresa/components/EmpresaModulo";
import { UsuarioModulo } from "./usuario/components/UsuarioModulo";

export default function AdminPage() {
  return (
    <div>
      <EmpresaModulo />
      <UsuarioModulo />
    </div>
  );
}
