"use client";

import { Bot, LoaderCircle, MessageSquarePlus, Send } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { MentorCitations } from "@/components/shared/mentor-citations";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { aiClient, type AIMessage } from "@/lib/ai-client";

type RAGConversation = {
  id: string;
  title: string;
  updated_at: string;
};

function MentorPageContent() {
  const searchParams = useSearchParams();
  const { accessToken } = useAuth();
  const [conversations, setConversations] = useState<RAGConversation[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handledPromptRef = useRef<string | null>(null);
  const dashboardPrompt = searchParams.get("prompt")?.trim() ?? "";

  useEffect(() => {
    if (!accessToken || !active) { setMessages([]); return; }
    void aiClient.chatHistory(accessToken, active).then(setMessages).catch(() => setError("Could not load messages."));
  }, [accessToken, active]);

  async function newConversation() {
    setActive(null);
    setMessages([]);
  }

  const sendMentorMessage = useCallback(async function sendMentorMessage(
    content: string,
    options: { forceNew?: boolean } = {},
  ) {
    if (!accessToken || busy) return;
    setBusy(true);
    setError(null);
    setInput("");
    try {
      const pendingMessage: AIMessage = {
        id: `pending-${Date.now()}`,
        role: "user",
        content,
        disposition: "answered",
        created_at: new Date().toISOString(),
      };
      setMessages((items) => (options.forceNew ? [pendingMessage] : [...items, pendingMessage]));
      const turn = await aiClient.queryChat(accessToken, content, options.forceNew ? null : active);
      const now = new Date().toISOString();
      const userMessage: AIMessage = {
        id: `user-${turn.message_id}`,
        conversation_id: turn.conversation_id,
        role: "user",
        content,
        created_at: now,
      };
      const assistantMessage: AIMessage = {
        id: turn.message_id,
        conversation_id: turn.conversation_id,
        role: "assistant",
        content: turn.answer,
        confidence: turn.confidence,
        citations: turn.citations,
        retrieved_chunks: turn.retrieved_chunks,
        processing_time_ms: Math.round(turn.processing_time * 1000),
        created_at: now,
      };
      setMessages((items) =>
        options.forceNew
          ? [userMessage, assistantMessage]
          : [
              ...items.filter((message) => message.id !== pendingMessage.id),
              userMessage,
              assistantMessage,
            ],
      );
      setConversations((items) => [
        { id: turn.conversation_id, title: content.slice(0, 80), updated_at: now },
        ...items.filter((item) => item.id !== turn.conversation_id),
      ]);
      setActive(turn.conversation_id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "AI Mentor is unavailable.");
    } finally {
      setBusy(false);
    }
  }, [accessToken, active, busy]);

  useEffect(() => {
    if (!accessToken || !dashboardPrompt || handledPromptRef.current === dashboardPrompt || busy) return;
    handledPromptRef.current = dashboardPrompt;
    void sendMentorMessage(dashboardPrompt, { forceNew: true });
  }, [accessToken, busy, dashboardPrompt, sendMentorMessage]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content) return;
    await sendMentorMessage(content);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader eyebrow="AI mentor" title="Study support with your learning context." description="Ask about lessons, exams, planning, motivation, or study pressure. The mentor stays within education-related support." action={<Button onClick={() => void newConversation()}><MessageSquarePlus />New chat</Button>} />
        <div className="grid min-h-[38rem] gap-4 lg:grid-cols-[16rem_1fr]">
          <Card className="p-3">
            <p className="px-2 pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Conversations</p>
            <div className="space-y-1">
              {conversations.map((conversation) => <button key={conversation.id} onClick={() => setActive(conversation.id)} className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm ${active === conversation.id ? "bg-orange-50 font-semibold text-orange-700" : "text-slate-600 hover:bg-slate-50"}`}>{conversation.title}</button>)}
            </div>
          </Card>
          <Card className="flex min-h-[38rem] flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {messages.length === 0 && <div className="mx-auto mt-20 max-w-md text-center"><Bot className="mx-auto size-10 text-orange-600" /><h2 className="mt-4 text-xl font-semibold text-slate-950">What are you working on?</h2><p className="mt-2 text-sm leading-6 text-slate-500">Give me your goal or ask about the lesson you are studying.</p></div>}
              {messages.map((message) => (
                <div key={message.id} className={`max-w-2xl rounded-2xl p-4 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}>
                  {message.content}
                  {message.role === "assistant" && (
                    <MentorCitations citations={message.citations} retrievedChunks={message.retrieved_chunks} />
                  )}
                </div>
              ))}
              {busy && <LoaderCircle className="size-6 animate-spin text-orange-600" />}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <form onSubmit={submit} className="border-t border-slate-200 p-4">
              <div className="flex items-end gap-3"><Textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask your mentor…" className="min-h-20" maxLength={4000} /><Button size="icon" disabled={busy || !input.trim()} aria-label="Send"><Send /></Button></div>
              <p className="mt-2 text-xs text-slate-400">GaugeHow Mentor is educational support, not medical or emergency care.</p>
            </form>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

export default function MentorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-transparent" />}>
      <MentorPageContent />
    </Suspense>
  );
}
