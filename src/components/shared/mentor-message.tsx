"use client";

import { ArrowClockwise, CaretDown } from "@phosphor-icons/react";
import { useState } from "react";
import { MentorCitations } from "@/components/shared/mentor-citations";
import { MentorMarkdown } from "@/components/shared/mentor-markdown";
import { MentorOrb } from "@/components/shared/mentor-orb";
import { cn } from "@/lib/utils";
import type { AIMessage } from "@/lib/ai-client";

type MentorMessageProps = {
  message: AIMessage;
  isFresh?: boolean;
  onRegenerate?: () => void;
  regenerating?: boolean;
};

export function MentorMessage({ message, isFresh, onRegenerate, regenerating }: MentorMessageProps) {
  const [sourcesOpen, setSourcesOpen] = useState(false);

  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-xl rounded-2xl bg-slate-950 px-4 py-2.5 text-sm leading-6 text-white">
        {message.content}
      </div>
    );
  }

  const sourceCount = message.citations?.length || message.retrieved_chunks?.length || 0;
  const showTrustLine = message.disposition !== "crisis_support" && message.processing_time_ms != null;

  return (
    <div className="flex max-w-2xl gap-3">
      <MentorOrb size="sm" className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className={cn(isFresh && "mentor-reveal")}>
          <MentorMarkdown content={message.content} />
        </div>

        {showTrustLine && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span>Answered in {Math.max(1, Math.round((message.processing_time_ms ?? 0) / 100) / 10)}s</span>
            {sourceCount > 0 ? (
              <button
                type="button"
                onClick={() => setSourcesOpen((value) => !value)}
                className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-accent"
              >
                grounded in {sourceCount} source{sourceCount === 1 ? "" : "s"}
                <CaretDown className={cn("size-3 transition-transform", sourcesOpen && "rotate-180")} />
              </button>
            ) : (
              <span>general guidance</span>
            )}
            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                disabled={regenerating}
                className="inline-flex items-center gap-1 font-semibold text-slate-500 transition hover:text-accent disabled:opacity-50"
              >
                <ArrowClockwise className={cn("size-3", regenerating && "animate-spin")} />
                Regenerate
              </button>
            )}
          </div>
        )}

        {sourcesOpen && (
          <MentorCitations citations={message.citations} retrievedChunks={message.retrieved_chunks} />
        )}
      </div>
    </div>
  );
}
