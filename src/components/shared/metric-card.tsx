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
  orange: "bg-orange-50 text-orange-600",
  green: "bg-emerald-50 text-emerald-600",
  blue: "bg-sky-50 text-sky-600",
  rose: "bg-rose-50 text-rose-600",
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
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-bold tracking-normal text-slate-950">
            {value}
          </p>
          <p className="text-sm font-semibold text-emerald-600">{change}</p>
        </div>
        <div className={cn("rounded-lg p-3", toneStyles[tone])}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

