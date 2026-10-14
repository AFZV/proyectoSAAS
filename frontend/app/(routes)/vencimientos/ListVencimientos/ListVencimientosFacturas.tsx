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
  clienteId: string;
  cliente: {
    rasonZocial: string;
    nit?: string | null;
    nombre?: string;
    apellidos?: string;
    telefono?: string | "";
    email?: string | "";
    ciudad?: string | null;
  };
  vendedor?: string | null;
  pdfUrl?: string | null;
  diasRestantes?: number;
  estado?: string | null;
  prioridadCobro?: "ALTA" | "MEDIA" | "BAJA";
  diasEnMora?: number;
};

const MS_DIA = 86_400_000;
const DIAS_MORA_VENCIDO = 15; // 👈 regla nueva

const toYMD = (d: Date) => {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
};

const diffDaysFromToday = (iso: string) => {
  const v = toYMD(new Date(iso));
  const t = toYMD(new Date());
  return Math.round((v.getTime() - t.getTime()) / MS_DIA);
};

// Prioridad: ALTA si vencida ≥15 días y saldo>0, MEDIA si vencida <15 días, BAJA si no vencida o saldo=0
function computePrioridad(diasRestantes: number, saldo: number) {
  if (saldo <= 0) return "BAJA" as const;
  const diasVencidos = Math.max(0, -diasRestantes); // días después del vencimiento
  if (diasVencidos >= DIAS_MORA_VENCIDO) return "ALTA" as const;
  if (diasRestantes < 0) return "MEDIA" as const;
  return "BAJA" as const;
}

async function getNombreEmpresa(token: string): Promise<string> {
  const API = process.env.NEXT_PUBLIC_API_URL!;
  try {
    const res = await fetch(`${API}/auth/usuario-actual`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data?.nombreEmpresa ?? "";
  } catch {
    return "";
  }
}

async function getVencimientosClientes(
  token: string
): Promise<VencimientoFacturaCliente[]> {
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

      const diasEnMora = Math.max(0, -diasRestantes); // solo >0 si está vencida
      // Si el backend ya manda prioridadCobro, la respetamos; si no, la calculamos con la misma regla.
      const prioridadCobro =
        f.prioridadCobro ?? computePrioridad(diasRestantes, f.saldo);

      return { ...f, diasRestantes, prioridadCobro, diasEnMora };
    })
    .sort(
      (a, b) =>
        new Date(a.fechaVencimiento).getTime() -
        new Date(b.fechaVencimiento).getTime()
    );
}

export async function ListVencimientosFacturasPage() {
  const token = await getToken();
  if (!token) return <VencimientosClientesClient initialData={[]} />;

  const [data, nombreEmpresa] = await Promise.all([
    getVencimientosClientes(token),
    getNombreEmpresa(token),
  ]);

  return (
    <VencimientosClientesClient initialData={data} nombreEmpresa={nombreEmpresa} />
  );
}
