import Link from "next/link";
import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  compact?: boolean;
};

export function BrandLogo({ className, compact = false }: BrandLogoProps) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-3 font-semibold text-slate-950", className)}
    >
      <span className="flex size-10 items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm shadow-orange-500/25">
        <Gauge className="size-5" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-lg tracking-normal">GaugeHow</span>
          <span className="block text-xs font-medium text-slate-500">
            Learning OS
          </span>
        </span>
      )}
    </Link>
  );
}

