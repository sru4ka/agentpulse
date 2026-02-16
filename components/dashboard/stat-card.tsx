interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
}

export default function StatCard({ title, value, subtitle, trend }: StatCardProps) {
  const trendColor =
    trend === "up"
      ? "text-[#10B981]"
      : trend === "down"
        ? "text-[#EF4444]"
        : "text-[#A1A1AA]";

  const trendIcon =
    trend === "up" ? (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 11V3M7 3L3 7M7 3L11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ) : trend === "down" ? (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 3V11M7 11L3 7M7 11L11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ) : null;

  return (
    <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
      <p className="text-sm text-[#A1A1AA]">{title}</p>
      <p className="text-3xl font-bold text-[#FAFAFA] mt-2">{value}</p>
      {(subtitle || trend) && (
        <div className="flex items-center gap-1.5 mt-2">
          {trend && trendIcon && (
            <span className={trendColor}>{trendIcon}</span>
          )}
          {subtitle && (
            <span className={`text-xs ${trendColor}`}>{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}
