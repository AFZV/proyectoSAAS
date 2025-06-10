import axios from "axios";
import { Cliente, columns } from "./columns";
import { DataTable } from "./data-table";

import { auth } from "@clerk/nextjs";
import { getToken } from "@/lib/getToken";

export async function getClientes(): Promise<any[]> {
  //const { userId } = auth();
  const token = await getToken();

  if (token === null) {
    console.error("No hay token de autenticación");
    console.error("No hay usuario autenticado");
    return [];
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clientes`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  return data; // lista de clientes
}

export default async function ListClientsPage() {
  const data = await getClientes();

  return (
    <section className="min-h-screen bg-background text-foreground px-4 py-4">
      <div className="max-w-6xl mx-auto">
        <DataTable columns={columns} data={data} />
      </div>
    </section>
  );
}
