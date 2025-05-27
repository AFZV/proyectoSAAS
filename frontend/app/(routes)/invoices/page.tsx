import { HeaderInvoices } from "./components/HeaderInvoices";
import { ListaPedidos } from "./components/ListaPedidos";

export default async function InvoicesPage() {
  return (
    <div className="flex flex-col">
      <span className="font-bold text-2xl text-center">Lista de Pedidos</span>
      <ListaPedidos />
    </div>
  );
}
