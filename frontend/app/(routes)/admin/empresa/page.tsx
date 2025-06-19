import React from "react";
import { HeaderEmpresa } from "./components/HeaderEmpresa";
import ListEmpresasPage from "./components/ListEmpresas/ListEmpresas";

export default function EmpresasPage() {
  return (
    <div>
      <HeaderEmpresa />
      <ListEmpresasPage />
    </div>
  );
}
