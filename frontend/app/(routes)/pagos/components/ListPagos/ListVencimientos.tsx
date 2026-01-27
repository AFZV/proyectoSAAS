// app/(routes)/pagos/(pages)/vencimientos/page.tsx
import { getToken } from "@/lib/getToken";
import VencimientosTable from "./VencimientosTable";

type VencimientoFacturaProveedor = {
  idFacturaProveedor: string;
  numero: string;
  fechaEmision: string;
  fechaVencimiento: string;
  total: number;
  saldo: number;
  moneda: "COP" | "USD" | "CNY" | string;
  estado?: string | null;
  tasaCambio?: number | null;
  proveedor: {
    razonsocial: string;
    identificacion?: string | null;
  };
  diasRestantes?: number;
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
  const ms = v.getTime() - t.getTime();
  return Math.round(ms / 86_400_000);
};

async function getFacturasPorVencer(): Promise<VencimientoFacturaProveedor[]> {
  const token = await getToken();
  if (!token) return [];

  const API = process.env.NEXT_PUBLIC_API_URL!;
  const res = await fetch(`${API}/facturas-proveedor/vencimientos`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return [];

  const data: VencimientoFacturaProveedor[] = await res.json();

  const enriched = data
    .map((f) => ({
      ...f,
      diasRestantes:
        typeof f.diasRestantes === "number"
          ? f.diasRestantes
          : diffDaysFromToday(f.fechaVencimiento),
    }))
    .sort(
      (a, b) =>
        new Date(a.fechaVencimiento).getTime() -
        new Date(b.fechaVencimiento).getTime()
    );

  return enriched;
}

export default async function ListVencimientosPage() {
  const data = await getFacturasPorVencer();
  return <VencimientosTable data={data} />;
}
