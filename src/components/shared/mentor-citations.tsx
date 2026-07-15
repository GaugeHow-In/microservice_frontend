"use client";

import { FileText } from "@phosphor-icons/react";
import type { Citation, RetrievedChunk } from "@/lib/ai-client";

type MentorCitationsProps = {
  citations?: Citation[];
  retrievedChunks?: RetrievedChunk[];
};

function citationsFromChunks(chunks: RetrievedChunk[] = []): Citation[] {
  const seen = new Set<string>();
  const citations: Citation[] = [];
  for (const chunk of chunks) {
    const key = `${chunk.document_id}:${chunk.page_number ?? "unknown"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    citations.push({
      document_name: chunk.document_name,
      lesson: chunk.lesson,
      page_number: chunk.page_number,
      similarity_score: chunk.similarity_score,
      document_id: chunk.document_id,
      chunk_id: chunk.chunk_id,
    });
  }
  return citations;
}

export function MentorCitations({ citations, retrievedChunks }: MentorCitationsProps) {
  const sources = citations?.length ? citations : citationsFromChunks(retrievedChunks);
  if (!sources.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {sources.slice(0, 4).map((source) => (
        <span
          key={`${source.document_id}:${source.chunk_id}`}
          className="inline-flex max-w-full items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600"
          title={`${source.document_name}${source.lesson ? ` - ${source.lesson}` : ""}`}
        >
          <FileText className="size-3 shrink-0 text-orange-600" />
          <span className="truncate">{source.document_name}</span>
          {source.page_number && <span className="shrink-0 text-slate-400">p. {source.page_number}</span>}
        </span>
      ))}
    </div>
  );
}
