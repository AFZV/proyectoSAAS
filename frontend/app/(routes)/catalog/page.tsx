import { auth } from "@clerk/nextjs";
import { getToken } from "@/lib/getToken";
import { catalogService } from "./services/catalog.services";
import { CatalogClient } from "./(components)/CatalogClient";
import { HeaderCatalog } from "./(components)/HeaderCatalog";

export default async function CatalogPage() {
  const { userId } = auth();

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Acceso no autorizado</h2>
          <p className="text-muted-foreground">
            Debes iniciar sesión para acceder al catálogo
          </p>
        </div>
      </div>
    );
  }

  try {
    // Obtener token y datos del usuario
    const token = await getToken();
    const userResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/usuario-actual`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!userResponse.ok) {
      throw new Error("Error al cargar usuario");
    }

    const usuario = await userResponse.json();

    // Obtener productos para el catálogo
    const productos = await catalogService.getProductosParaCatalogo(token);

    return (
      <div className="min-h-screen bg-background">
        {/* Header con botón crear producto (solo admin) */}
        {usuario.rol === "admin" && <HeaderCatalog />}

        {/* Información del usuario */}
        <div className="border-b bg-card/50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold">Catálogo de Productos</h1>
              <p className="text-sm text-muted-foreground">
                Bienvenido:{" "}
                <span className="font-medium">
                  {usuario.nombre} {usuario.apellidos || ""}
                </span>
                <span className="mx-2">•</span>
                Rol:{" "}
                <span className="font-medium capitalize">{usuario.rol}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Componente cliente con toda la funcionalidad */}
        <CatalogClient
          productos={productos}
          userType={usuario.rol}
          userName={`${usuario.nombre} ${usuario.apellidos || ""}`.trim()}
        />
      </div>
    );
  } catch (error) {
    console.error("Error en CatalogPage:", error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-destructive">
            Error al cargar el catálogo
          </h2>
          <p className="text-muted-foreground">
            No se pudieron cargar los productos. Inténtalo de nuevo más tarde.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }
}
