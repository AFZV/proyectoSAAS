// app/(routes)/cartera/(pages)/vencimientos-clientes/page.tsx
import { getToken } from "@/lib/getToken";
import { VencimientosClientesClient } from "./VencimientosClientesClient";

type VencimientoFacturaCliente = {
  idPedido: string;
  numero: string;
  fechaEmision: string;
  fechaVencimiento: string;
  total: number;
  saldo: number;
  cliente: {
    rasonZocial: string;
    nit?: string | null;
    nombre?: string;
    apellidos?: string;
  };
  diasRestantes?: number;
  estado?: string | null;
  prioridadCobro?: "ALTA" | "MEDIA" | "BAJA";
  diasEnMora?: number;
};

const diffDaysFromToday = (iso: string) => {
  const today = new Date();
  const toYMD = (d: Date) => {
    const nd = new Date(d);
    nd.setHours(0, 0, 0, 0);
    return nd;
  };
  const v = toYMD(new Date(iso));
  const t = toYMD(today);
  return Math.round((v.getTime() - t.getTime()) / 86_400_000);
};

function computePrioridad(diasRestantes: number, saldo: number) {
  if (saldo <= 0) return "BAJA" as const;
  const mora = diasRestantes < 0 ? Math.abs(diasRestantes) : 0;
  if (mora >= 100) return "ALTA" as const;
  if (diasRestantes < 0) return "MEDIA" as const;
  return "BAJA" as const;
}

async function getVencimientosClientes(): Promise<VencimientoFacturaCliente[]> {
  const token = await getToken();
  if (!token) return [];
  const API = process.env.NEXT_PUBLIC_API_URL!;
  const res = await fetch(`${API}/balance/vencimientos-clientes/saldos`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data: VencimientoFacturaCliente[] = await res.json();

  return data
    .map((f) => {
      const diasRestantes =
        typeof f.diasRestantes === "number"
          ? f.diasRestantes
          : diffDaysFromToday(f.fechaVencimiento);
      const prioridadCobro = computePrioridad(diasRestantes, f.saldo);
      const diasEnMora = diasRestantes < 0 ? Math.abs(diasRestantes) : 0;
      return { ...f, diasRestantes, prioridadCobro, diasEnMora };
    })
    .sort(
      (a, b) =>
        new Date(a.fechaVencimiento).getTime() -
        new Date(b.fechaVencimiento).getTime()
    );
}

export async function ListVencimientosFacturasPage() {
  const data = await getVencimientosClientes();
  return <VencimientosClientesClient initialData={data} />;
}
