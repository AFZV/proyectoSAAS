import { CustomIcon } from "@/components/CustomIcon";
import { Notebook } from "lucide-react";

export function LastOrders() {
  return (
    <div className="shadow sm bg-background rounded-lg p-5">
      <div className="flex gap-x-2 items-center">
        <CustomIcon icon={Notebook} />
        <p className="text-2xl">Ultimos Pedidos</p>
      </div>
      <div></div>
    </div>
  );
}
