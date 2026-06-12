import { getToken } from "@/lib/getToken";
import { redirect } from "next/navigation";
import AuditoriaClient from "./components/AuditoriaClient";

export default async function AuditoriaPage() {
  const token = await getToken();
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/usuario-actual`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );
  if (!res.ok) redirect("/");
  const usuario = await res.json();
  if (usuario.rol !== "admin" && usuario.rol !== "superadmin") redirect("/");

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <AuditoriaClient />
    </div>
  );
}
