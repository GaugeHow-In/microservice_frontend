import { AIMark } from "@/components/shared/ai-mark";
import { cn } from "@/lib/utils";

type MentorOrbProps = {
  state?: "idle" | "thinking";
  size?: "sm" | "lg";
  className?: string;
};

export function MentorOrb({ state = "idle", size = "lg", className }: MentorOrbProps) {
  return (
    <div
      className={cn(
        "mentor-orb",
        state,
        size === "lg" ? "size-16" : "size-8",
        className,
      )}
      aria-hidden="true"
    >
      <AIMark state={state} className={size === "lg" ? "size-11" : "size-6"} />
    </div>
  );
}
