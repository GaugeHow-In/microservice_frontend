"use client";

import { ChatCenteredDots, ClockCounterClockwise, PaperPlaneTilt } from "@phosphor-icons/react";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { useLearningContext } from "@/components/providers/learning-context-provider";
import { MentorHistoryDrawer } from "@/components/shared/mentor-history-drawer";
import { MentorMessage } from "@/components/shared/mentor-message";
import { MentorOrb } from "@/components/shared/mentor-orb";
import { Button } from "@/components/ui/button";
import { aiClient, type AIMessage, type ConversationSummary } from "@/lib/ai-client";

const genericPrompts = [
  "Explain a tricky engineering concept",
  "Help me plan this week's study",
  "Quiz me on what I just learned",
  "Give me a memory trick for a formula",
];

function MentorPageContent() {
  const searchParams = useSearchParams();
  const { accessToken, user } = useAuth();
  const { context } = useLearningContext();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [freshMessageId, setFreshMessageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handledPromptRef = useRef<string | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const dashboardPrompt = searchParams.get("prompt")?.trim() ?? "";

  const loadConversations = useCallback(() => {
    if (!accessToken) return;
    setConversationsLoading(true);
    void aiClient
      .listConversations(accessToken)
      .then(setConversations)
      .catch(() => setError("Could not load your history."))
      .finally(() => setConversationsLoading(false));
  }, [accessToken]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!accessToken || !active) {
      setMessages([]);
      return;
    }
    void aiClient.chatHistory(accessToken, active).then(setMessages).catch(() => setError("Could not load messages."));
  }, [accessToken, active]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  function newConversation() {
    setActive(null);
    setMessages([]);
    setHistoryOpen(false);
  }

  function selectConversation(id: string) {
    setActive(id);
    setHistoryOpen(false);
  }

  function removeConversation(id: string) {
    if (!accessToken) return;
    void aiClient.deleteConversation(accessToken, id).then(() => {
      setConversations((items) => items.filter((item) => item.id !== id));
      if (active === id) newConversation();
    });
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
      const turn = await aiClient.queryChat(
        accessToken,
        content,
        options.forceNew ? null : active,
        {
          course_id: context?.course_id ?? null,
          lesson_id: context?.lesson_id ?? null,
        },
        context,
      );
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
      setFreshMessageId(assistantMessage.id);
      setActive(turn.conversation_id);
      loadConversations();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "AI Mentor is unavailable.");
    } finally {
      setBusy(false);
    }
  }, [accessToken, active, busy, context, loadConversations]);

  async function regenerate(messageId: string) {
    if (!accessToken) return;
    setRegeneratingId(messageId);
    setError(null);
    try {
      const turn = await aiClient.regenerateChat(accessToken, messageId);
      const now = new Date().toISOString();
      const updated: AIMessage = {
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
      setMessages((items) => items.map((message) => (message.id === messageId ? updated : message)));
      setFreshMessageId(updated.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not regenerate that answer.");
    } finally {
      setRegeneratingId(null);
    }
  }

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

  const firstName = (user?.display_name ?? "there").split(" ")[0];

  const promptChips = useMemo(() => {
    const contextChips: string[] = [];
    if (context?.lesson_title) contextChips.push(`Explain ${context.lesson_title}`);
    if (context?.course_title) contextChips.push(`Quiz me on ${context.course_title}`);
    return [...contextChips, ...genericPrompts].slice(0, 4);
  }, [context]);

  const lastAssistantId = [...messages].reverse().find((message) => message.role === "assistant")?.id ?? null;

  return (
    <AppShell>
      <div className="flex min-h-[calc(100vh-10rem)] flex-col">
        <div className="flex items-center justify-end gap-2 pb-4">
          <Button variant="ghost" size="sm" onClick={newConversation}>
            <ChatCenteredDots />
            New chat
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)}>
            <ClockCounterClockwise />
            History
          </Button>
        </div>

        {messages.length === 0 ? (
          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 text-center">
            <MentorOrb size="lg" state="idle" />
            <div>
              <h1 className="text-3xl font-extrabold text-slate-950 md:text-4xl">Hey {firstName}.</h1>
              <p className="mt-2 text-base text-slate-500">What are we figuring out today?</p>
            </div>

            <form onSubmit={submit} className="w-full">
              <div className="relative rounded-full surface-secondary p-2 shadow-[var(--shadow-sm)]">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask about lessons, formulas, or your next study move..."
                  className="h-14 w-full rounded-full bg-transparent pl-6 pr-20 text-base text-slate-950 outline-none placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="absolute right-4 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-orange-400 text-slate-950 transition hover:bg-orange-300 disabled:opacity-50"
                  aria-label="Send"
                >
                  <PaperPlaneTilt className="size-5" />
                </button>
              </div>
            </form>

            <div className="flex flex-wrap justify-center gap-2">
              {promptChips.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="rounded-full surface-secondary px-4 py-2 text-xs font-bold text-slate-500 transition hover:text-accent"
                >
                  {prompt}
                </button>
              ))}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 pb-6">
              {messages.map((message) => (
                <MentorMessage
                  key={message.id}
                  message={message}
                  isFresh={message.id === freshMessageId}
                  onRegenerate={message.id === lastAssistantId ? () => regenerate(message.id) : undefined}
                  regenerating={regeneratingId === message.id}
                />
              ))}
              {busy && (
                <div className="flex items-center gap-3">
                  <MentorOrb size="sm" state="thinking" />
                  <span className="text-sm text-slate-400">Thinking…</span>
                </div>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div ref={transcriptEndRef} />
            </div>

            <form onSubmit={submit} className="sticky bottom-4 mx-auto w-full max-w-2xl">
              <div className="relative rounded-full surface-secondary p-2 shadow-[var(--shadow-lg)]">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask a follow-up..."
                  className="h-14 w-full rounded-full bg-transparent pl-6 pr-20 text-base text-slate-950 outline-none placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="absolute right-4 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-orange-400 text-slate-950 transition hover:bg-orange-300 disabled:opacity-50"
                  aria-label="Send"
                >
                  <PaperPlaneTilt className="size-5" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <MentorHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        conversations={conversations}
        loading={conversationsLoading}
        activeId={active}
        onSelect={selectConversation}
        onDelete={removeConversation}
      />
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
