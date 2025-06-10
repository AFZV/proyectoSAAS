// CardSummary.tsx
import { CustomIcon } from "@/components/CustomIcon";
import { CardSummaryProps } from "./CardSummary.data";
import { TrendingUp, TrendingDown } from "lucide-react";

export function CardSummary(props: CardSummaryProps) {
  const { icon: Icon, title, total, subtitle, trend, trendColor = "gray" } = props;

  const getTrendIcon = () => {
    if (!trend) return null;
    const isPositive = trend.startsWith('+');
    return isPositive ? (
      <TrendingUp className="h-4 w-4" />
    ) : (
      <TrendingDown className="h-4 w-4" />
    );
  };

  const getTrendColorClasses = () => {
    switch (trendColor) {
      case "green":
        return "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400";
      case "red":
        return "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border shadow-sm hover:shadow-md transition-all duration-200 group">
      {/* Header with Icon and Title */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:scale-110 transition-transform duration-200">
            <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Value */}
      <div className="mb-3">
        <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
          {total}
        </p>
      </div>

      {/* Trend Indicator */}
      {trend && (
        <div className="flex items-center space-x-1">
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getTrendColorClasses()}`}>
            {getTrendIcon()}
            <span>{trend}</span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">vs mes anterior</span>
        </div>
      )}
    </div>
  );
}