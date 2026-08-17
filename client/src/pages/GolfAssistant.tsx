import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, BookOpen, RotateCcw, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content: "Hi — I’m your Golf Trip Assistant. I can explain how to use the app or help with general golf rules. For an official competition ruling, always confirm the current Rules of Golf and ask the event committee.",
};

const PROMPTS = [
  "How does Stableford scoring work?",
  "How are 4BBB best Stableford points calculated?",
  "How does countback decide a tied leaderboard?",
  "How do I enter scores for my playing partner?",
  "What is the relief rule for a ball in a penalty area?",
];

export default function GolfAssistant() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [error, setError] = useState<string | null>(null);

  const askAssistant = trpc.assistant.ask.useMutation({
    onSuccess: ({ answer }) => {
      setMessages((current) => [...current, { role: "assistant", content: answer }]);
    },
    onError: (mutationError) => {
      setError(mutationError.message || "The assistant could not answer just now. Please try again.");
    },
  });

  const handleSend = (content: string) => {
    if (askAssistant.isPending) return;
    setError(null);
    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    askAssistant.mutate({
      messages: nextMessages
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({ role: message.role as "user" | "assistant", content: message.content })),
    });
  };

  const resetConversation = () => {
    if (askAssistant.isPending) return;
    setMessages([WELCOME_MESSAGE]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" aria-label="Back to your trips"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-bold text-foreground">Golf Trip Assistant</h1>
              <p className="text-xs text-muted-foreground">App help and general golf rules</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 gap-2" onClick={resetConversation} disabled={askAssistant.isPending}>
            <RotateCcw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">New chat</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-100/90">
          <div className="flex items-start gap-2">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p><strong>Rules guidance:</strong> answers are general information, not an official ruling. Confirm local rules and disputed competition decisions with your committee.</p>
          </div>
        </div>
        {error && <div role="alert" className="mb-3 rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
        <AIChatBox
          messages={messages}
          onSendMessage={handleSend}
          isLoading={askAssistant.isPending}
          height="min(68vh, 680px)"
          placeholder="Ask about the app or a golf rule…"
          emptyStateMessage="Ask about your trip, scoring, or a golf rule"
          suggestedPrompts={PROMPTS}
        />
      </main>
    </div>
  );
}
