"use client";

import { Usuario } from "./usuario.types";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/nextjs";
type Props = {
  usuario: Usuario;
  refetchUsuarios: () => void;
};
export function UsuarioActions({ usuario, refetchUsuarios }: Props) {
  const { getToken } = useAuth();
  const toggleEstado = async () => {
    console.log("values", usuario.estado);
    try {
      const token = await getToken();
      if (token) {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/usuario/estado/${usuario.id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        refetchUsuarios();
      }
    } catch (error) {
      if (error) {
        throw error;
      }
    }

    // Idealmente actualizar lista o usar mutate
    //window.location.reload();
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={toggleEstado}>
        {usuario.estado === "activo" ? "Inactivar" : "Activar"}
      </Button>
      <Button variant="secondary">Editar</Button>
    </div>
  );
}
