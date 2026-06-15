import Link from "next/link";
import { Bot, Sparkles } from "lucide-react";
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
    <section className="rounded-lg border border-orange-200 bg-orange-50 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white">
            <Bot className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-950">{title}</h2>
              <Sparkles className="size-4 text-orange-500" />
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
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

