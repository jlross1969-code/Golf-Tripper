import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, ImagePlus, Loader2, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { TRIP_CHAT_IMAGE_MAX_BYTES, isTripChatImageType } from "../../../shared/tripChatAttachment";

type PendingImage = { file: File; previewUrl: string };

export default function TripChat() {
  const { tripId } = useParams<{ tripId: string }>();
  const parsedTripId = parseInt(tripId ?? "0", 10);
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const { data: messages = [], isLoading } = trpc.chat.getMessages.useQuery(
    { tripId: parsedTripId, limit: 100 },
    { enabled: !!parsedTripId, refetchInterval: 5000 }
  );

  function clearPendingImage() {
    setPendingImage((current) => {
      if (current) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
  }

  const sendMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      void utils.chat.getMessages.invalidate({ tripId: parsedTripId });
      setMessage("");
      clearPendingImage();
    },
  });

  useEffect(() => () => {
    if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl);
  }, [pendingImage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const chooseImage = (file?: File) => {
    setUploadError(null);
    if (!file) return;
    if (!isTripChatImageType(file.type)) { setUploadError("Choose a JPEG, PNG, WebP, or GIF image."); return; }
    if (file.size > TRIP_CHAT_IMAGE_MAX_BYTES) { setUploadError("Choose an image smaller than 5 MB."); return; }
    clearPendingImage();
    setPendingImage({ file, previewUrl: URL.createObjectURL(file) });
  };

  const handleSend = async () => {
    const trimmed = message.trim();
    if ((!trimmed && !pendingImage) || !parsedTripId || sendMutation.isPending || isUploading) return;
    setUploadError(null);
    try {
      let attachment: { imageUrl?: string; imageKey?: string; imageAlt?: string } = {};
      if (pendingImage) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("tripId", String(parsedTripId));
        formData.append("image", pendingImage.file);
        const response = await fetch("/api/upload/trip-chat-image", { method: "POST", body: formData });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.url || !payload.key) throw new Error(payload.error || "Image upload failed");
        attachment = { imageUrl: payload.url, imageKey: payload.key, imageAlt: payload.alt ?? "Trip chat image" };
      }
      await sendMutation.mutateAsync({ tripId: parsedTripId, message: trimmed, ...attachment });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Message could not be sent. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  if (!parsedTripId) return <div className="flex h-full items-center justify-center text-muted-foreground">No trip selected.</div>;
  const sending = sendMutation.isPending || isUploading;

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col pb-28 sm:pb-0">
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <MessageCircle className="h-5 w-5 text-primary" />
        <div><h1 className="font-semibold text-foreground">Trip Chat</h1><p className="text-xs text-muted-foreground">All players in this trip</p></div>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        {isLoading ? <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Loading messages…</div>
          : messages.length === 0 ? <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground"><MessageCircle className="h-8 w-8 opacity-30" /><p className="text-sm">No messages yet. Share an update or photo!</p></div>
            : <div className="flex flex-col gap-3">{messages.map((msg) => {
              const isOwn = user?.id === msg.userId;
              const hasImage = Boolean(msg.imageUrl);
              return <div key={msg.id} className={`flex flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}>
                {!isOwn && <span className="px-1 text-xs font-medium text-muted-foreground">{msg.userName ?? "Unknown"}</span>}
                <div className={`max-w-[82%] overflow-hidden rounded-2xl text-sm leading-relaxed ${hasImage ? "p-1" : "px-4 py-2"} ${isOwn ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted text-foreground"}`}>
                  {msg.imageUrl && <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer" className="block"><img src={msg.imageUrl} alt={msg.imageAlt || "Trip chat attachment"} loading="lazy" className="max-h-80 w-full rounded-xl object-cover" /></a>}
                  {msg.message && <p className={hasImage ? "px-2 pb-2 pt-1" : ""}>{msg.message}</p>}
                </div>
                <span className="px-1 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
              </div>;
            })}<div ref={bottomRef} /></div>}
      </ScrollArea>

      <div className="border-t border-border bg-card px-4 py-3">
        {pendingImage && <div className="mb-2 flex items-center gap-2 rounded-xl border border-border bg-muted/35 p-2"><img src={pendingImage.previewUrl} alt="Selected upload preview" className="h-14 w-14 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground">{pendingImage.file.name}</p><p className="text-xs text-muted-foreground">Add an optional comment, then send</p></div><Button type="button" variant="ghost" size="icon" onClick={clearPendingImage} disabled={sending} aria-label="Remove selected image"><X className="h-4 w-4" /></Button></div>}
        {uploadError && <div role="alert" className="mb-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5" />{uploadError}</div>}
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" capture="environment" className="hidden" onChange={(event) => { chooseImage(event.target.files?.[0]); event.currentTarget.value = ""; }} />
          <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={sending} aria-label="Add photo"><ImagePlus className="h-4 w-4" /></Button>
          <Input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={handleKeyDown} placeholder={pendingImage ? "Add a comment (optional)…" : "Type a message…"} className="flex-1" maxLength={1000} disabled={sending} />
          <Button type="button" size="icon" onClick={() => void handleSend()} disabled={(!message.trim() && !pendingImage) || sending} className="shrink-0" aria-label="Send message">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
        </div>
      </div>
    </div>
  );
}
