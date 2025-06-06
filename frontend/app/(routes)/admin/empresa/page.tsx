"use client";
import React from "react";
import { HeaderPanels } from "@/components/HeaderPanels";
import { FormCrearEmpresa } from "../components/FormCrearEmpresa";

export default function EmpresasPage() {
  return (
    <div>
      <div className="pb-10 mb-10">
        <HeaderPanels
          title="Panel de Empresas"
          buttonLabel="Crear Empresa"
          dialogTitle="Crear Empresa"
          dialogDescription="Crear Una Nueva Empresa"
        >
          {(setOpenModalCreate) => (
            <FormCrearEmpresa setOpenModalCreate={setOpenModalCreate} />
          )}
        </HeaderPanels>
      </div>
    </div>
  );
}
