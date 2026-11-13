import { cn } from "@/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg?: string;
  trend?: { value: number; label: string };
  color?: "blue" | "green" | "red" | "yellow" | "purple" | "gray";
  onClick?: () => void;
  className?: string;
}

const colorMap = {
  blue: {
    bg: "bg-primary-50",
    icon: "bg-primary-600",
    text: "text-primary-700",
  },
  green: { bg: "bg-green-50", icon: "bg-green-600", text: "text-green-700" },
  red: { bg: "bg-red-50", icon: "bg-red-600", text: "text-red-700" },
  yellow: {
    bg: "bg-yellow-50",
    icon: "bg-yellow-500",
    text: "text-yellow-700",
  },
  purple: {
    bg: "bg-purple-50",
    icon: "bg-purple-600",
    text: "text-purple-700",
  },
  gray: { bg: "bg-gray-50", icon: "bg-gray-500", text: "text-gray-700" },
};

export default function KpiCard({
  title,
  value,
  subtitle,
  icon,
  color = "blue",
  trend,
  onClick,
  className,
}: KpiCardProps) {
  const colors = colorMap[color];

  return (
    <div
      onClick={onClick}
      className={cn(
        "card !p-0 flex items-stretch overflow-hidden",
        onClick && "cursor-pointer card-hover",
        className,
      )}
    >
      {/* Bande icône — pleine hauteur */}
      <div
        className={cn(
          "flex items-center justify-center flex-shrink-0 w-12 text-white",
          colors.icon,
        )}
      >
        {icon}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0 px-3 py-2">
        <p className="text-xs text-gray-500 font-medium leading-tight">
          {title}
        </p>
        <p
          className={cn("text-xl font-bold mt-0.5 leading-tight", colors.text)}
        >
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>
        )}
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 mt-1 text-xs font-medium",
              trend.value > 0
                ? "text-green-600"
                : trend.value < 0
                  ? "text-red-600"
                  : "text-gray-500",
            )}
          >
            {trend.value > 0 ? (
              <TrendingUp size={11} />
            ) : trend.value < 0 ? (
              <TrendingDown size={11} />
            ) : (
              <Minus size={11} />
            )}
            <span>
              {trend.value > 0 ? "+" : ""}
              {trend.value}% {trend.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
