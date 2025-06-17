import HeaderCliente from "./components/HeaderCliente/HeaderCliente";
import ListClientsPage from "./components/ListClientes/ListClients";

export default function ClientesPage() {
  return (
    <div className="min-h-screen bg-background">
      <HeaderCliente />
      <div className="pb-6">
        <ListClientsPage />
      </div>
    </div>
  );
}