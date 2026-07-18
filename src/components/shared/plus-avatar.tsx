import { Sparkle } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps an avatar with a subtle GaugeHow-Plus treatment: a golden gradient ring
 * and a small sparkle emblem at the corner. Non-Plus users render the avatar as
 * is, so this is safe to use everywhere an avatar appears.
 */
export function PlusAvatar({
  isPlus,
  children,
  emblem = true,
  className
}: {
  isPlus: boolean;
  children: ReactNode;
  emblem?: boolean;
  className?: string;
}) {
  if (!isPlus) {
    return <>{children}</>;
  }

  return (
    <span className={cn("relative inline-flex", className)}>
      {/* Golden ring: a gradient border drawn with padding around the avatar. */}
      <span
        className="rounded-full bg-[conic-gradient(from_140deg,#fde68a,#f59e0b,#b45309,#fbbf24,#fde68a)] p-[2px] shadow-[0_0_0_1px_rgba(180,120,10,0.25),0_2px_10px_rgba(245,158,11,0.35)]"
        aria-hidden={false}
      >
        <span className="block rounded-full bg-[color:var(--surface-1,#fff)] p-[1.5px]">
          {children}
        </span>
      </span>
      {emblem && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-white shadow ring-2 ring-[color:var(--surface-1,#fff)]"
          title="GaugeHow-Plus"
          aria-label="GaugeHow-Plus member"
        >
          <Sparkle weight="fill" className="size-2.5" />
        </span>
      )}
    </span>
  );
}

/** Inline golden "Plus" pill for labels and menus. */
export function PlusBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm",
        className
      )}
    >
      <Sparkle weight="fill" className="size-2.5" />
      Plus
    </span>
  );
}
