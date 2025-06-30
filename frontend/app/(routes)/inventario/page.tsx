// app/(routes)/inventario/page.tsx
import ListInventariosPage from "./(components)/ListInventario/ListInventariosPage";
import { ModalManager } from "./(components)/ModalManager";

export default function InventarioPage() {
  return (
    <ModalManager>
      <ListInventariosPage />
    </ModalManager>
  );
}