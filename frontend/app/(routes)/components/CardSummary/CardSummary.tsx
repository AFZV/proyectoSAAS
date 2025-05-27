import { CustomIcon } from "@/components/CustomIcon";
import { CardSummaryProps } from "./CardSummary.data";

export function CardSummary(props: CardSummaryProps) {
  const { icon: Icon, title, total } = props;
  return (
    <div className="shadow-sm bg-background rounded-lg p-5 py-3 hover:shadow-lg transition">
      <div className="flex justify-between ">
        <div className="flex gap-2 items-center">
          <CustomIcon icon={Icon} />
          {title}
        </div>
      </div>
      <div className="flex  gap-4 mt-2 md: mt-4">
        <p className="text-2xl ">{total}</p>
      </div>
    </div>
  );
}
