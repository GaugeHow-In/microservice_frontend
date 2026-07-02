"use client";

import { Bot, LoaderCircle, Send, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { aiClient, type AIMessage } from "@/lib/ai-client";

export function QuickMentor() {
  const { accessToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || !accessToken || busy) return;
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const pendingMessage: AIMessage = {
        id: `pending-${Date.now()}`,
        role: "user",
        content,
        disposition: "answered",
        created_at: new Date().toISOString(),
      };
      setMessages((current) => [...current, pendingMessage]);
      const turn = await aiClient.queryChat(accessToken, content, conversationId);
      setConversationId(turn.conversation_id);
      const userMessage: AIMessage = {
        id: `user-${turn.message_id}`,
        conversation_id: turn.conversation_id,
        role: "user",
        content,
        created_at: new Date().toISOString(),
      };
      const assistantMessage: AIMessage = {
        id: turn.message_id,
        conversation_id: turn.conversation_id,
        role: "assistant",
        content: turn.answer,
        confidence: turn.confidence,
        retrieved_chunks: turn.retrieved_chunks,
        created_at: new Date().toISOString(),
      };
      setMessages((current) => [
        ...current.filter((message) => message.id !== pendingMessage.id),
        userMessage,
        assistantMessage,
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Mentor is unavailable");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 lg:bottom-6 lg:right-6">
      {open && (
        <div className="chrome-surface mb-3 flex h-[30rem] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl shadow-[var(--shadow-lg)]">
          <div className="flex items-center justify-between border-b border-slate-200/70 p-4">
            <div className="flex items-center gap-2 font-semibold text-slate-950"><Bot className="size-5 text-orange-600" />Quick mentor <span className="text-xs text-slate-400">Beta</span></div>
            <Button size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close mentor"><X /></Button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.length === 0 && <p className="rounded-xl bg-orange-50 p-3 text-slate-600">Ask about what you are studying on this page.</p>}
            {messages.map((message) => <div key={message.id} className={`max-w-[88%] rounded-xl p-3 leading-5 ${message.role === "user" ? "ml-auto bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>{message.content}</div>)}
            {busy && <LoaderCircle className="size-5 animate-spin text-orange-600" />}
            {error && <p className="text-red-600">{error}</p>}
          </div>
          <form onSubmit={submit} className="flex gap-2 border-t border-slate-200/70 p-3">
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask a quick question…" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-400" maxLength={4000} />
            <Button size="icon" disabled={busy || !input.trim()} aria-label="Send"><Send /></Button>
          </form>
        </div>
      )}
      <Button size="icon" className="size-14 rounded-full shadow-[var(--shadow-lg)]" onClick={() => setOpen((value) => !value)} aria-label="Open quick mentor"><Bot className="size-6" /></Button>
    </div>
  );
}
