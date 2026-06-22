import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="hero-aura signal-line surface-elevated panel-depth reveal-up relative overflow-hidden rounded-2xl p-5 sm:p-6">
      <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl space-y-3">
          {eyebrow && <Badge variant="orange">{eyebrow}</Badge>}
          <div className="space-y-2">
            <h1 className="type-h1 text-slate-950">
              {title}
            </h1>
            <p className="type-body-lg text-slate-600">{description}</p>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
