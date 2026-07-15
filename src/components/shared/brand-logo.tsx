import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  compact?: boolean;
  /** Where the lockup links. Signed-in surfaces point at the dashboard. */
  href?: string;
};

export function BrandLogo({ className, compact = false, href = "/" }: BrandLogoProps) {
  return (
    <Link
      href={href}
      aria-label="GaugeHowLearning OS"
      className={cn("flex items-center gap-3 text-slate-950", className)}
    >
      <span className="flex size-10 items-center justify-center overflow-hidden rounded-lg border border-orange-200 bg-white shadow-[var(--shadow-sm)]">
        <Image
          src="/64 logo.png"
          alt=""
          width={28}
          height={28}
          className="size-7 object-contain"
          aria-hidden="true"
        />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="type-h4 block">GaugeHow</span>
          <span className="type-caption block font-medium text-slate-500">
            Learning OS
          </span>
        </span>
      )}
    </Link>
  );
}
