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
  console.log("esto hay en data :", data);
  console.log("si llego al backend");

  return (
    <div className="container mx-auto py-10">
      {<DataTable columns={columns} data={data} />}
    </div>
  );
}
