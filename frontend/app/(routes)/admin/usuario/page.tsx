import { HeaderUsuario } from "./components/HeaderUsuario";
import ListUsuariosPage from "./components/ListUsuarios/ListUsuarios";

export default function usuariosPage() {
  return (
    <div className="p-4 max-w-6xl mx-auto">
      <HeaderUsuario />
      <ListUsuariosPage />
    </div>
  );
}
