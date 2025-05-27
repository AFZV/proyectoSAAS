///
"use client";

import { FormCreateProduct } from "../FormCreateProduct";
import { HeaderPanels } from "@/components/HeaderPanels";

export function HeaderCatalog() {
  return (
    <div>
      <HeaderPanels
        buttonLabel="Crear Producto"
        title="CATALOGO"
        dialogTitle="Crear Producto"
        dialogDescription="Crear Nuevo Producto"
      >
        {(setOpenModalCreate) => (
          <FormCreateProduct setOpenModalCreate={setOpenModalCreate} />
        )}
      </HeaderPanels>
    </div>
  );
}
