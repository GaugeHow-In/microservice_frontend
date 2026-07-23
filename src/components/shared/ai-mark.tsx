import Image from "next/image";
import { cn } from "@/lib/utils";

type AIMarkProps = {
  /** thinking adds a gentle pulse on top of the logo's own animation */
  state?: "idle" | "thinking";
  /** false renders the static logo frame (tiny sizes, dense lists) */
  animated?: boolean;
  className?: string;
};

/**
 * GaugeHow AI mark — the actual brand logo animation:
 * `public/gaugehow-ai-mark.webp` is the official animated-logo GIF
 * (kept as `gaugehow-ai-mark.gif`) converted 1:1 to animated WebP
 * (320px, ~1MB vs 7MB); the static variant is its first frame.
 * The art is the black mark on transparency; in dark mode the
 * `.ai-mark` CSS inverts it to white so it fits either theme.
 */
export function AIMark({ state = "idle", animated = true, className }: AIMarkProps) {
  return (
    <Image
      src={animated ? "/gaugehow-ai-mark.webp" : "/gaugehow-ai-mark-static.webp"}
      alt=""
      width={500}
      height={500}
      unoptimized
      aria-hidden="true"
      className={cn(
        "ai-mark object-contain",
        state === "thinking" && "thinking",
        className,
      )}
    />
  );
}
