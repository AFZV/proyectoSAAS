import { LucideIcon } from "lucide-react";

export type CardSummaryProps = {
  icon: LucideIcon;
  total: string;
  title: string;
  subtitle?: string;
  trend?: string;
  trendColor?: "green" | "red" | "gray";
};
