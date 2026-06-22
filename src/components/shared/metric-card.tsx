import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string;
  change: string;
  icon: LucideIcon;
  tone?: "orange" | "green" | "blue" | "rose" | "slate";
};

const toneStyles = {
  orange: "bg-orange-50 text-orange-500",
  green: "bg-orange-100/70 text-orange-500",
  blue: "bg-orange-200/35 text-orange-500",
  rose: "bg-orange-50 text-orange-500",
  slate: "bg-slate-100 text-slate-700",
};

export function MetricCard({
  label,
  value,
  change,
  icon: Icon,
  tone = "orange",
}: MetricCardProps) {
  return (
    <Card className="panel-depth reveal-up overflow-hidden">
      <CardContent className="relative flex items-start justify-between gap-4 p-5">
        <div className="absolute inset-x-0 top-0 h-px bg-orange-300/40" />
        <div className="space-y-2">
          <p className="type-small font-medium text-slate-500">{label}</p>
          <p className="type-h3 text-slate-950">
            {value}
          </p>
          <p className="type-small font-semibold text-orange-500">{change}</p>
        </div>
        <div className={cn("rounded-lg p-3 shadow-[var(--shadow-sm)]", toneStyles[tone])}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
