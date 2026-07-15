import { Robot } from "@phosphor-icons/react/dist/ssr";
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
      <Robot className={size === "lg" ? "size-8" : "size-4"} />
    </div>
  );
}
