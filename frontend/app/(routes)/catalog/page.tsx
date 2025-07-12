// page.tsx
import { auth } from "@clerk/nextjs";
import { getToken } from "@/lib/getToken";
import { catalogService } from "./services/catalog.services";
import { CatalogClient } from "./(components)/CatalogClient";
import { HeaderCatalog } from "./(components)/HeaderCatalog/HeaderCatalog";

export default async function CatalogPage() {
  const { userId } = auth();

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-red-600 text-2xl">🔒</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Acceso no autorizado
          </h2>
          <p className="text-gray-600 max-w-md">
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
      <div className="space-y-6">
        {/* Header con botones de administración y estadísticas (solo admin) */}
        {usuario.rol === "admin" && (
          <HeaderCatalog
            totalProductos={productos.length}
            productosEnStock={productos.filter((p) => p.stock > 0).length}
          />
        )}

        {/* Componente cliente con toda la funcionalidad */}
        <CatalogClient
          productos={productos}
          userType={usuario.rol}
          userName={`${usuario.nombre} ${usuario.apellidos || ""}`}
        />
      </div>
    );
  } catch (error) {
    console.error("Error en CatalogPage:", error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Error al cargar el catálogo
          </h2>
          <p className="text-gray-600">
            No se pudieron cargar los productos. Inténtalo de nuevo más tarde.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }
}
