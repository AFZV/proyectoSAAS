import { HeaderOrdenesCompra } from "./components/HeaderOrdenesCompra/HeaderOrdenesCompra";
import { ListOrdenesCompra } from "./components/ListOrdenesCompra/ListOrdenesCompra";
import { RecomendacionCompra } from "./components/RecomendacionCompra/RecomendacionCompra";

export default function OrdenesCompraPage() {
  return (
    <div>
      <HeaderOrdenesCompra />
      <ListOrdenesCompra />
      <div className="max-w-6xl mx-auto px-4 py-2">
        <hr className="border-border" />
      </div>
      <RecomendacionCompra />
    </div>
  );
}
