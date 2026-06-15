import { cn } from "@/lib/utils";

type ProgressRingProps = {
  value: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "size-16 text-sm",
  md: "size-24 text-xl",
  lg: "size-32 text-3xl",
};

export function ProgressRing({
  value,
  label,
  size = "md",
  className,
}: ProgressRingProps) {
  const background = `conic-gradient(#f97316 ${value * 3.6}deg, #e2e8f0 0deg)`;

  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full",
        sizes[size],
        className,
      )}
      style={{ background }}
      aria-label={`${label ?? "Progress"} ${value}%`}
    >
      <div className="absolute inset-2 rounded-full bg-white" />
      <div className="relative text-center font-bold text-slate-950">
        {value}%
        {label && (
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

