"use client";
import React from "react";
import { HeaderPanels } from "@/components/HeaderPanels";
import { FormCrearEmpresa } from "../FormCrearEmpresa";
import { FormCrearUsuario } from "../FormCrearUsuario/FormCrearUsuario";

export default function HeaderAdmin() {
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
      <div>
        <HeaderPanels
          title="Panel de Usuarios"
          buttonLabel="Crear Usuario"
          dialogTitle="Crear Usuario"
          dialogDescription="Crear Un Nuevo Usuario"
        >
          {(setOpenModalUsuarioCreate) => (
            <FormCrearUsuario
              setOpenModalUsuarioCreate={setOpenModalUsuarioCreate}
            />
          )}
        </HeaderPanels>
      </div>
    </div>
  );
}
