import axios from "axios";
import { Cliente, columns } from "./columns";
import { DataTable } from "./data-table";

import { auth } from "@clerk/nextjs";

export async function getClientes(): Promise<any[]> {
  const { userId } = auth();

  if (!userId) {
    console.error("No hay usuario autenticado");
    return [];
  }

  const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/clientes`, {
    headers: {
      Authorization: userId,
    },
  });

  return res.data; // lista de clientes
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
