import { AIMark } from "@/components/shared/ai-mark";
import { cn } from "@/lib/utils";

type MentorOrbProps = {
  state?: "idle" | "thinking";
  size?: "sm" | "lg";
  className?: string;
};

/** The AI mentor's face: the free-floating GaugeHow gear + dog mark. */
export function MentorOrb({ state = "idle", size = "lg", className }: MentorOrbProps) {
  return (
    <AIMark
      state={state}
      className={cn(
        "ai-mark-free text-slate-950",
        size === "lg" ? "size-20" : "size-8",
        className,
      )}
    />
  );
}
