import React from "react";
import { HeaderEmpresa } from "./components/HeaderEmpresa";
import ListEmpresasPage from "./components/ListEmpresas/ListEmpresas";
import { redirect } from "next/navigation";
import { getToken } from "@/lib/getToken";

export default async function EmpresasPage() {
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
        <HeaderEmpresa />
        <ListEmpresasPage />
      </div>
    )
  );
}
