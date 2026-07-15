import Link from "next/link";
import { Robot, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

type AiStripProps = {
  title?: string;
  description?: string;
  cta?: string;
};

export function AiStrip({
  title = "AI Mentor is ready",
  description = "Ask for explanations, summaries, notes, study plans, or goal adjustments based on your current progress.",
  cta = "Ask AI",
}: AiStripProps) {
  return (
    <section className="surface-secondary rounded-xl p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-orange-400 text-white shadow-[var(--shadow-sm)]">
            <Robot className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="type-h4 text-slate-950">{title}</h2>
              <Sparkle className="size-4 text-orange-500" />
            </div>
            <p className="mt-1 max-w-3xl type-small text-slate-600">
              {description}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/mentor">{cta}</Link>
        </Button>
      </div>
    </section>
  );
}
