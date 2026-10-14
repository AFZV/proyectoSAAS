"use client";

import { columns, type ClienteConSaldo } from "./columns";
import { DataTableClients } from "./data-table";

// Pequeño wrapper de cliente: columns.tsx tiene "use client" y ahora columns() es una
// función (necesita nombreEmpresa para armar el mensaje de WhatsApp del estado de
// cartera) — no se puede invocar esa función desde el Server Component de la página,
// porque cruzar el límite server/cliente solo permite pasar valores serializables, no
// llamar funciones exportadas de un módulo "use client". Por eso este wrapper (cliente)
// recibe los datos ya serializados y es quien llama columns(nombreEmpresa) de verdad.
export function ClientesConSaldoTable({
  data,
  nombreEmpresa,
  searchColumnId,
  searchPlaceholder,
}: {
  data: ClienteConSaldo[];
  nombreEmpresa?: string;
  searchColumnId: string;
  searchPlaceholder: string;
}) {
  return (
    <DataTableClients
      searchColumnId={searchColumnId}
      searchPlaceholder={searchPlaceholder}
      columns={columns(nombreEmpresa)}
      data={data}
    />
  );
}
