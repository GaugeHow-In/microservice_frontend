import { cn } from "@/lib/utils";

type AIMarkProps = {
  /** idle = slow gear spin + gentle bob; thinking = fast spin + trot */
  state?: "idle" | "thinking";
  /** Disable all motion (tiny sizes, dense lists). */
  animated?: boolean;
  className?: string;
};

/**
 * GaugeHow AI mark — the brand gear with the dog mascot inside.
 * Vector recreation of the main logo so each layer can animate:
 * the gear ring spins, the aperture blades counter-spin, and the
 * dog stays upright, bobbing and wagging its tail.
 *
 * Colors: gear/disc use `currentColor`; the dog uses
 * `--ai-mark-dog` (defaults to white, like the source logo).
 */
export function AIMark({ state = "idle", animated = true, className }: AIMarkProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("ai-mark", animated && state, className)}
      fill="currentColor"
      aria-hidden="true"
    >
      <g className="ai-mark-gear">
        <path
          fillRule="evenodd"
          stroke="currentColor"
          strokeWidth={3.5}
          strokeLinejoin="round"
          d="M41.84 12.89 L43.75 4.43 A46.0 46.0 0 0 1 56.25 4.43 L58.16 12.89 A38.0 38.0 0 0 1 70.48 17.99 L77.80 13.35 A46.0 46.0 0 0 1 86.65 22.20 L82.01 29.52 A38.0 38.0 0 0 1 87.11 41.84 L95.57 43.75 A46.0 46.0 0 0 1 95.57 56.25 L87.11 58.16 A38.0 38.0 0 0 1 82.01 70.48 L86.65 77.80 A46.0 46.0 0 0 1 77.80 86.65 L70.48 82.01 A38.0 38.0 0 0 1 58.16 87.11 L56.25 95.57 A46.0 46.0 0 0 1 43.75 95.57 L41.84 87.11 A38.0 38.0 0 0 1 29.52 82.01 L22.20 86.65 A46.0 46.0 0 0 1 13.35 77.80 L17.99 70.48 A38.0 38.0 0 0 1 12.89 58.16 L4.43 56.25 A46.0 46.0 0 0 1 4.43 43.75 L12.89 41.84 A38.0 38.0 0 0 1 17.99 29.52 L13.35 22.20 A46.0 46.0 0 0 1 22.20 13.35 L29.52 17.99 A38.0 38.0 0 0 1 41.84 12.89 Z M50 22.5 A27.5 27.5 0 1 0 50 77.5 A27.5 27.5 0 1 0 50 22.5 Z"
        />
      </g>
      <g
        className="ai-mark-blades"
        stroke="currentColor"
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      >
        <path d="M50 31 A30 30 0 0 1 74 61.2" />
        <path d="M50 31 A30 30 0 0 1 74 61.2" transform="rotate(120 50 50)" />
        <path d="M50 31 A30 30 0 0 1 74 61.2" transform="rotate(240 50 50)" />
      </g>
      <circle cx={50} cy={50} r={19.5} />
      <g className="ai-mark-dog" fill="var(--ai-mark-dog, var(--background, #fff))">
        <path
          className="ai-mark-tail"
          d="M58.6 44.5 L59.3 35.5 L62.6 36 L61.9 44.9 Z"
        />
        <path d="M32.5 43.8 L38.8 42.8 L40 42.2 L40.8 35.2 L44 40.8 L46.2 35.8 L48.8 41.5 L51.5 43.2 L58.3 43.2 L61.9 43.4 L64.6 46.8 L64.6 58.5 L61.4 58.5 L61.4 52 L57.9 52 L57.9 58.5 L54.7 58.5 L54.7 51.2 L44.3 51.2 L44.3 58.5 L41.1 58.5 L41.1 51.2 L38.6 51.2 L38.6 58.5 L35.4 58.5 L35.4 49.5 L32.5 47.2 Z" />
      </g>
    </svg>
  );
}
