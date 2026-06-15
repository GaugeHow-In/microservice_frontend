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
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl space-y-3">
        {eyebrow && <Badge variant="orange">{eyebrow}</Badge>}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-normal text-slate-950 md:text-4xl">
            {title}
          </h1>
          <p className="text-base leading-7 text-slate-600">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

