import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, Flag, ImagePlus, Loader2, MessageCircle, Send, ShieldAlert, SmilePlus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { TRIP_CHAT_IMAGE_MAX_BYTES, isTripChatImageType } from "../../../shared/tripChatAttachment";
import { MAX_TRIP_CHAT_IMAGES, TRIP_CHAT_REACTION_OPTIONS } from "../../../shared/tripChatAlbum";

type PendingImage = { file: File; previewUrl: string };
const REACTION_OPTIONS = TRIP_CHAT_REACTION_OPTIONS;
const MAX_CHAT_IMAGES = MAX_TRIP_CHAT_IMAGES;

export default function TripChat() {
  const { tripId } = useParams<{ tripId: string }>();
  const parsedTripId = parseInt(tripId ?? "0", 10);
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [reactionPickerFor, setReactionPickerFor] = useState<number | null>(null);
  const [reportingAttachmentId, setReportingAttachmentId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportsOpen, setReportsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImagesRef = useRef<PendingImage[]>([]);
  const utils = trpc.useUtils();

  const { data: messages = [], isLoading } = trpc.chat.getMessages.useQuery(
    { tripId: parsedTripId, limit: 100 },
    { enabled: !!parsedTripId, refetchInterval: 5000 }
  );
  const { data: moderationStatus } = trpc.chat.moderationStatus.useQuery({ tripId: parsedTripId }, { enabled: !!parsedTripId });
  const { data: reports = [] } = trpc.chat.listAttachmentReports.useQuery({ tripId: parsedTripId }, { enabled: !!parsedTripId && moderationStatus?.canModerate && reportsOpen });

  useEffect(() => { pendingImagesRef.current = pendingImages; }, [pendingImages]);
  useEffect(() => () => { pendingImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl)); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  function clearPendingImages() {
    setPendingImages((current) => { current.forEach((image) => URL.revokeObjectURL(image.previewUrl)); return []; });
  }
  function removePendingImage(index: number) {
    setPendingImages((current) => {
      const image = current[index];
      if (image) URL.revokeObjectURL(image.previewUrl);
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
  }

  const sendMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      void utils.chat.getMessages.invalidate({ tripId: parsedTripId });
      setMessage("");
      clearPendingImages();
    },
  });
  const reactionMutation = trpc.chat.toggleReaction.useMutation({ onSuccess: () => { void utils.chat.getMessages.invalidate({ tripId: parsedTripId }); } });
  const reportMutation = trpc.chat.reportAttachment.useMutation({ onSuccess: () => { setReportingAttachmentId(null); setReportReason(""); setUploadError(null); void utils.chat.listAttachmentReports.invalidate({ tripId: parsedTripId }); } });
  const removeAttachmentMutation = trpc.chat.removeAttachment.useMutation({ onSuccess: () => { void utils.chat.getMessages.invalidate({ tripId: parsedTripId }); void utils.chat.listAttachmentReports.invalidate({ tripId: parsedTripId }); } });
  const dismissReportMutation = trpc.chat.dismissAttachmentReport.useMutation({ onSuccess: () => { void utils.chat.listAttachmentReports.invalidate({ tripId: parsedTripId }); } });

  const chooseImages = (files: FileList | null) => {
    setUploadError(null);
    if (!files?.length) return;
    const available = MAX_CHAT_IMAGES - pendingImages.length;
    if (available <= 0) { setUploadError("You can share up to four photos in one message."); return; }
    const selected = Array.from(files).slice(0, available);
    const invalid = selected.find((file) => !isTripChatImageType(file.type) || file.size <= 0 || file.size > TRIP_CHAT_IMAGE_MAX_BYTES);
    if (invalid) { setUploadError("Choose JPEG, PNG, WebP, or GIF photos smaller than 5 MB."); return; }
    setPendingImages((current) => [...current, ...selected.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))]);
    if (files.length > available) setUploadError("Only the first available photos were added; a message can contain up to four.");
  };

  const uploadImage = async (image: PendingImage) => {
    const formData = new FormData();
    formData.append("tripId", String(parsedTripId));
    formData.append("image", image.file);
    const response = await fetch("/api/upload/trip-chat-image", { method: "POST", body: formData });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.url || !payload.key) throw new Error(payload.error || "Image upload failed");
    return { imageUrl: payload.url as string, imageKey: payload.key as string, imageAlt: payload.alt as string || "Trip chat image" };
  };

  const handleSend = async () => {
    const trimmed = message.trim();
    if ((!trimmed && !pendingImages.length) || !parsedTripId || sendMutation.isPending || isUploading) return;
    setUploadError(null);
    try {
      setIsUploading(true);
      const attachments = await Promise.all(pendingImages.map(uploadImage));
      await sendMutation.mutateAsync({ tripId: parsedTripId, message: trimmed, attachments: attachments.length ? attachments : undefined });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Message could not be sent. Please try again.");
    } finally { setIsUploading(false); }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void handleSend(); }
  };

  if (!parsedTripId) return <div className="flex h-full items-center justify-center text-muted-foreground">No trip selected.</div>;
  const sending = sendMutation.isPending || isUploading;

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col pb-28 sm:pb-0">
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <MessageCircle className="h-5 w-5 text-primary" />
        <div className="min-w-0 flex-1"><h1 className="font-semibold text-foreground">Trip Chat</h1><p className="text-xs text-muted-foreground">All players in this trip</p></div>
        {moderationStatus?.canModerate && <Button variant="outline" size="sm" onClick={() => setReportsOpen(true)} className="gap-1.5"><ShieldAlert className="h-4 w-4" />Reports</Button>}
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        {isLoading ? <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Loading messages…</div>
          : messages.length === 0 ? <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground"><MessageCircle className="h-8 w-8 opacity-30" /><p className="text-sm">No messages yet. Share an update or photo!</p></div>
            : <div className="flex flex-col gap-4">{messages.map((msg) => {
              const isOwn = user?.id === msg.userId;
              const attachments = msg.attachments.length ? msg.attachments : msg.imageUrl ? [{ id: 0, imageUrl: msg.imageUrl, imageAlt: msg.imageAlt ?? "Trip chat attachment" }] : [];
              return <div key={msg.id} className={`group flex flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}>
                {!isOwn && <span className="px-1 text-xs font-medium text-muted-foreground">{msg.userName ?? "Unknown"}</span>}
                <div className={`max-w-[88%] overflow-hidden rounded-2xl text-sm leading-relaxed ${attachments.length ? "p-1" : "px-4 py-2"} ${isOwn ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted text-foreground"}`}>
                  {attachments.length > 0 && <div className={`grid gap-1 ${attachments.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>{attachments.map((attachment) => <div key={attachment.id} className="relative"><a href={attachment.imageUrl} target="_blank" rel="noopener noreferrer" className="block"><img src={attachment.imageUrl} alt={attachment.imageAlt || "Trip chat attachment"} loading="lazy" className={`w-full rounded-xl object-cover ${attachments.length === 1 ? "max-h-80" : "aspect-square"}`} /></a>{attachment.id > 0 && <Button type="button" variant="secondary" size="icon" onClick={() => setReportingAttachmentId(attachment.id)} className="absolute right-1 top-1 h-7 w-7 rounded-full bg-background/85 shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100" aria-label="Report photo"><Flag className="h-3.5 w-3.5 text-destructive" /></Button>}</div>)}</div>}
                  {msg.message && <p className={attachments.length ? "px-2 pb-2 pt-1" : ""}>{msg.message}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-1 px-1 pt-0.5">
                  {msg.reactions.map((reaction) => <button type="button" key={reaction.emoji} onClick={() => reactionMutation.mutate({ tripId: parsedTripId, messageId: msg.id, emoji: reaction.emoji as typeof REACTION_OPTIONS[number] })} className={`rounded-full border px-1.5 py-0.5 text-xs transition-colors ${reaction.reactedByCurrentUser ? "border-primary bg-primary/15" : "border-border bg-card"}`}>{reaction.emoji} {reaction.count}</button>)}
                  <div className="relative"><Button type="button" variant="ghost" size="icon" onClick={() => setReactionPickerFor(reactionPickerFor === msg.id ? null : msg.id)} className="h-6 w-6 rounded-full transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100" aria-label="Add reaction"><SmilePlus className="h-3.5 w-3.5" /></Button>{reactionPickerFor === msg.id && <div className="absolute bottom-7 left-0 z-10 flex rounded-full border border-border bg-popover p-1 shadow-lg">{REACTION_OPTIONS.map((emoji) => <button key={emoji} type="button" className="rounded-full px-1.5 py-1 hover:bg-muted" onClick={() => { reactionMutation.mutate({ tripId: parsedTripId, messageId: msg.id, emoji }); setReactionPickerFor(null); }}>{emoji}</button>)}</div>}</div>
                </div>
                <span className="px-1 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
              </div>;
            })}<div ref={bottomRef} /></div>}
      </ScrollArea>

      <div className="border-t border-border bg-card px-4 py-3">
        {pendingImages.length > 0 && <div className="mb-2 grid grid-cols-4 gap-2">{pendingImages.map((image, index) => <div key={image.previewUrl} className="relative"><img src={image.previewUrl} alt={`Selected photo ${index + 1}`} className="aspect-square w-full rounded-lg object-cover" /><Button type="button" variant="secondary" size="icon" onClick={() => removePendingImage(index)} disabled={sending} className="absolute right-1 top-1 h-6 w-6 rounded-full"><X className="h-3.5 w-3.5" /></Button></div>)}</div>}
        {pendingImages.length > 0 && <p className="mb-2 text-xs text-muted-foreground">{pendingImages.length} of {MAX_CHAT_IMAGES} photos selected — add an optional comment below.</p>}
        {uploadError && <div role="alert" className="mb-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5" />{uploadError}</div>}
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" capture="environment" className="hidden" onChange={(event) => { chooseImages(event.target.files); event.currentTarget.value = ""; }} />
          <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={sending || pendingImages.length >= MAX_CHAT_IMAGES} aria-label="Add photos"><ImagePlus className="h-4 w-4" /></Button>
          <Input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={handleKeyDown} placeholder={pendingImages.length ? "Add a comment (optional)…" : "Type a message…"} className="flex-1" maxLength={1000} disabled={sending} />
          <Button type="button" size="icon" onClick={() => void handleSend()} disabled={(!message.trim() && !pendingImages.length) || sending} className="shrink-0" aria-label="Send message">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
        </div>
      </div>

      <Dialog open={reportingAttachmentId !== null} onOpenChange={(open) => { if (!open) { setReportingAttachmentId(null); setReportReason(""); } }}><DialogContent><DialogHeader><DialogTitle>Report photo</DialogTitle><DialogDescription>Tell the trip admins why this photo should be reviewed. Your report is visible only to moderators.</DialogDescription></DialogHeader><Textarea value={reportReason} onChange={(event) => setReportReason(event.target.value)} placeholder="Optional reason" maxLength={600} /><DialogFooter><Button variant="outline" onClick={() => setReportingAttachmentId(null)}>Cancel</Button><Button variant="destructive" disabled={reportMutation.isPending} onClick={() => reportingAttachmentId && reportMutation.mutate({ tripId: parsedTripId, attachmentId: reportingAttachmentId, reason: reportReason.trim() || undefined })}>{reportMutation.isPending ? "Sending…" : "Send report"}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={reportsOpen} onOpenChange={setReportsOpen}><DialogContent className="max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Attachment reports</DialogTitle><DialogDescription>Review reported Trip Chat photos. Removing hides the image for all players.</DialogDescription></DialogHeader>{reports.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No attachment reports.</p> : <div className="space-y-3">{reports.map((entry) => <div key={entry.report.id} className="rounded-xl border border-border p-3"><div className="flex gap-3"><img src={entry.attachment.imageUrl} alt={entry.attachment.imageAlt || "Reported attachment"} className="h-16 w-16 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{entry.reporterName || "Trip player"} reported this photo</p><p className="line-clamp-2 text-xs text-muted-foreground">{entry.report.reason || "No reason provided"}</p><p className="mt-1 text-xs capitalize text-muted-foreground">Status: {entry.report.status}</p></div></div>{entry.report.status === "open" && <div className="mt-3 flex justify-end gap-2"><Button size="sm" variant="outline" disabled={dismissReportMutation.isPending} onClick={() => dismissReportMutation.mutate({ tripId: parsedTripId, reportId: entry.report.id })}>Dismiss</Button><Button size="sm" variant="destructive" disabled={removeAttachmentMutation.isPending} onClick={() => removeAttachmentMutation.mutate({ tripId: parsedTripId, attachmentId: entry.attachment.id })}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Remove photo</Button></div>}</div>)}</div>}</DialogContent></Dialog>
    </div>
  );
}
