import React from "react";
import { EmpresaModulo } from "./empresa/components/EmpresaModulo";
import { UsuarioModulo } from "./usuario/components/UsuarioModulo";
import { getToken } from "@/lib/getToken";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const token = await getToken();
  const userLogged = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/superadmin`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!userLogged.ok) {
    redirect("/");
  }
  const usuario = await userLogged.json();

  const rol = usuario.rol;
  const superadmin = rol === "superadmin" ? rol : null;
  return (
    superadmin && (
      <div>
        <EmpresaModulo />
        <UsuarioModulo />
      </div>
    )
  );
}
