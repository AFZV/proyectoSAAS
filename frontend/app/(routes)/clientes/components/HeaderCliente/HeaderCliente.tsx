"use client";

import { HeaderPanels } from "@/components/HeaderPanels";
import React from "react";
import { FormCreateCliente } from "../FormCreateCliente";

export default function HeaderCliente() {
  return (
    <HeaderPanels
      buttonLabel="Crear Cliente"
      title="CLIENTES"
      dialogTitle="Crear Cliente"
      dialogDescription="Crear Nuevo Cliente"
    >
      {(setOpenModalCreate) => (
        <FormCreateCliente setOpenModalCreate={setOpenModalCreate} />
      )}
    </HeaderPanels>
  );
}
