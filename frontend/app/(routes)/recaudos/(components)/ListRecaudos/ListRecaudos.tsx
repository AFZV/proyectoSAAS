import { columns, ReciboConRelaciones } from "./columns";
import { ClienteDataTable } from "./data-table";

import { Loading } from "@/components/Loading";

export function ListRecaudos({ data }: { data: ReciboConRelaciones[] }) {
  if (!data) {
    return <Loading title="Cargando recibos..." />;
  }
  console.log("esto llega en recibos:", data);
  return (
    <div className="container mx-auto py-10">
      <ClienteDataTable columns={columns} data={data} />
    </div>
  );
}
