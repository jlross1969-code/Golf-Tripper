import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, BookOpen, History, MessageSquarePlus, Sparkles, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useMemo, useRef, useState } from "react";

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

function formatConversationDate(value: Date | string) {
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function GolfAssistant() {
  const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialTripId = Number(initialParams.get("tripId")) || null;
  const explainPlayerId = Number(initialParams.get("explainPlayerId")) || null;
  const explainTeamKey = initialParams.get("explainTeamKey");
  const explanationStarted = useRef(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [activeTripId, setActiveTripId] = useState<number | null>(initialTripId);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saveConversation, setSaveConversation] = useState(false);

  const utils = trpc.useUtils();
  const { data: conversations = [] } = trpc.assistant.listConversations.useQuery();
  const selectedConversation = trpc.assistant.getConversation.useQuery(
    { conversationId: conversationId ?? 0 },
    { enabled: conversationId !== null }
  );

  useEffect(() => {
    if (!selectedConversation.data) return;
    setMessages(selectedConversation.data.messages.length
      ? selectedConversation.data.messages.map((message) => ({ role: message.role, content: message.content }))
      : [WELCOME_MESSAGE]);
    setActiveTripId(selectedConversation.data.conversation.tripId ?? null);
  }, [selectedConversation.data]);

  const askAssistant = trpc.assistant.ask.useMutation({
    onSuccess: ({ answer, conversationId: savedConversationId }) => {
      setMessages((current) => [...current, { role: "assistant", content: answer }]);
      if (savedConversationId) setConversationId(savedConversationId);
      void utils.assistant.listConversations.invalidate();
    },
    onError: (mutationError) => {
      setError(mutationError.message || "The assistant could not answer just now. Please try again.");
    },
  });

  const explainScore = trpc.assistant.explainScore.useMutation({
    onSuccess: ({ answer, conversationId: savedConversationId }) => {
      const question = explainPlayerId ? "Explain this player's leaderboard score." : "Explain this 4BBB leaderboard score.";
      setMessages([{ role: "user", content: question }, { role: "assistant", content: answer }]);
      setConversationId(savedConversationId);
      void utils.assistant.listConversations.invalidate();
    },
    onError: (mutationError) => setError(mutationError.message || "The score explanation could not be generated just now."),
  });

  useEffect(() => {
    if (explanationStarted.current || !initialTripId || (!explainPlayerId && !explainTeamKey)) return;
    explanationStarted.current = true;
    explainScore.mutate({
      tripId: initialTripId,
      kind: explainPlayerId ? "player" : "pair",
      ...(explainPlayerId ? { userId: explainPlayerId } : { teamKey: explainTeamKey ?? undefined }),
    });
  }, [explainPlayerId, explainScore, explainTeamKey, initialTripId]);

  const deleteConversation = trpc.assistant.deleteConversation.useMutation({
    onSuccess: ({ success }, variables) => {
      if (success && conversationId === variables.conversationId) {
        setConversationId(null);
        setMessages([WELCOME_MESSAGE]);
      }
      void utils.assistant.listConversations.invalidate();
    },
  });

  const handleSend = (content: string) => {
    if (askAssistant.isPending || explainScore.isPending) return;
    setError(null);
    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    askAssistant.mutate({
      messages: nextMessages
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({ role: message.role as "user" | "assistant", content: message.content })),
      ...(conversationId ? { conversationId } : {}),
      ...(activeTripId ? { tripId: activeTripId } : {}),
      saveConversation: saveConversation || conversationId !== null,
    });
  };

  const resetConversation = () => {
    if (askAssistant.isPending || explainScore.isPending) return;
    setMessages([WELCOME_MESSAGE]);
    setConversationId(null);
    setError(null);
    window.history.replaceState({}, "", activeTripId ? `/assistant?tripId=${activeTripId}` : "/assistant");
  };

  const openConversation = (id: number) => {
    setError(null);
    setConversationId(id);
    setHistoryOpen(false);
  };

  const loading = askAssistant.isPending || explainScore.isPending;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href={activeTripId ? `/trip/${activeTripId}` : "/"}>
              <Button variant="ghost" size="icon" aria-label="Back to your trips"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15"><Sparkles className="h-5 w-5 text-primary" /></div>
            <div className="min-w-0">
              <h1 className="truncate font-bold text-foreground">Golf Trip Assistant</h1>
              <p className="text-xs text-muted-foreground">{activeTripId ? "Trip-aware help and score explanations" : "App help and general golf rules"}</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Saved chats"><History className="h-4 w-4" /></Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto">
                <SheetHeader><SheetTitle>Saved chats</SheetTitle></SheetHeader>
                <div className="mt-5 space-y-2">
                  {conversations.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-sm text-muted-foreground">Your saved questions will appear here.</p>
                  ) : conversations.map((conversation) => (
                    <div key={conversation.id} className={`flex items-center gap-1 rounded-xl border p-2 ${conversationId === conversation.id ? "border-primary/50 bg-primary/10" : "border-border"}`}>
                      <button type="button" onClick={() => openConversation(conversation.id)} className="min-w-0 flex-1 px-2 py-1 text-left">
                        <p className="truncate text-sm font-medium text-foreground">{conversation.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{formatConversationDate(conversation.updatedAt)}{conversation.tripId ? " · Trip context" : ""}</p>
                      </button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteConversation.mutate({ conversationId: conversation.id })} aria-label={`Delete ${conversation.title}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
            <Button variant="outline" size="sm" className="gap-2" onClick={resetConversation} disabled={loading}>
              <MessageSquarePlus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">New chat</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-100/90">
          <div className="flex items-start gap-2"><BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /><p><strong>Rules guidance:</strong> answers are general information, not an official ruling. Confirm local rules and disputed competition decisions with your committee.</p></div>
        </div>
        {activeTripId && <p className="mb-3 text-xs text-primary">This chat uses the selected trip’s administrator FAQs where relevant.</p>}
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={saveConversation} onChange={(event) => setSaveConversation(event.target.checked)} className="accent-primary" />
          Save this chat to my private history
        </label>
        {error && <div role="alert" className="mb-3 rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
        <AIChatBox messages={messages} onSendMessage={handleSend} isLoading={loading} height="min(68vh, 680px)" placeholder="Ask about the app or a golf rule…" emptyStateMessage="Ask about your trip, scoring, or a golf rule" suggestedPrompts={PROMPTS} />
      </main>
    </div>
  );
}
