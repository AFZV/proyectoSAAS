import { HeaderCatalog } from "./(components)/HeaderCatalog";
import { getAllProducts } from "@/lib/productos/getAll";
import { CatalogClientWrapper } from "./(components)/CatalogClientWrapper";
import { auth } from "@clerk/nextjs";
import axios from "axios";

export default async function CatalogPage() {
  const { userId } = auth();

  if (!userId) return <div>No autorizado</div>;

  const products = await getAllProducts();

  const response = await axios.get(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/usuario-actual`,
    {
      headers: {
        Authorization: userId,
      },
    }
  );

  const userExist = response.data;

  if (!userExist) return <div>Usuario no encontrado</div>;

  const userType = response.data.rol;

  console.log("esto llega en data a catalogo:", response.data);

  return (
    <div>
      {userType === "admin" && <HeaderCatalog />}
      <div className="text-center text-sm text-muted-foreground mb-2">
        <p>
          Bienvenido: {userExist.nombres} {userExist.apellidos}
        </p>
        <p>Rol:{userExist.rol}</p>
      </div>

      <CatalogClientWrapper productos={products} />
    </div>
  );
}
