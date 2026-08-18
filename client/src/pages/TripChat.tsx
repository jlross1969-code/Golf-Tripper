import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, ArrowLeft, ArrowRight, AtSign, ClipboardList, ChevronLeft, ChevronRight, Download, Flag, ImagePlus, Loader2, MessageCircle, Pencil, Pin, PinOff, Reply, RotateCcw, Search, Send, Share2, ShieldAlert, SmilePlus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { TRIP_CHAT_IMAGE_MAX_BYTES, isTripChatImageType } from "../../../shared/tripChatAttachment";
import { MAX_TRIP_CHAT_IMAGES, TRIP_CHAT_REACTION_OPTIONS, normaliseTripChatPhotoCaption, reorderTripChatPhotos } from "../../../shared/tripChatAlbum";
import { groupTripChatThreads } from "../../../shared/tripChatThread";

type PendingImage = { file: File; previewUrl: string; caption: string };
type ViewerImage = { id: number; imageUrl: string; imageAlt?: string | null; caption?: string | null; isOwn?: boolean };
const REACTION_OPTIONS = TRIP_CHAT_REACTION_OPTIONS;
const MAX_CHAT_IMAGES = MAX_TRIP_CHAT_IMAGES;

export default function TripChat() {
  const { tripId } = useParams<{ tripId: string }>();
  const parsedTripId = parseInt(tripId ?? "0", 10);
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [replyTarget, setReplyTarget] = useState<{ id: number; userName: string | null; message: string } | null>(null);
  const [chatSearch, setChatSearch] = useState("");
  const [mentionedUserIds, setMentionedUserIds] = useState<number[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [reactionPickerFor, setReactionPickerFor] = useState<number | null>(null);
  const [reportingAttachmentId, setReportingAttachmentId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportsOpen, setReportsOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [unreadMentionsOpen, setUnreadMentionsOpen] = useState(false);
  const [pinnedMessagesOpen, setPinnedMessagesOpen] = useState(false);
  const [captionEditingAttachment, setCaptionEditingAttachment] = useState<{ id: number; caption: string } | null>(null);
  const [deletingOwnAttachmentId, setDeletingOwnAttachmentId] = useState<number | null>(null);
  const [viewer, setViewer] = useState<{ images: ViewerImage[]; index: number } | null>(null);
  const [viewerZoom, setViewerZoom] = useState(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImagesRef = useRef<PendingImage[]>([]);
  const viewerTouchStart = useRef<number | null>(null);
  const viewerPinchStart = useRef<number | null>(null);
  const viewerPinchBase = useRef(1);
  const utils = trpc.useUtils();

  const { data: messages = [], isLoading } = trpc.chat.getMessages.useQuery(
    { tripId: parsedTripId, limit: 100, ...(chatSearch.trim() ? { search: chatSearch.trim() } : {}) },
    { enabled: !!parsedTripId, refetchInterval: 5000 }
  );
  const { data: mentionablePlayers = [] } = trpc.chat.mentionablePlayers.useQuery({ tripId: parsedTripId }, { enabled: !!parsedTripId });
  const { data: moderationStatus } = trpc.chat.moderationStatus.useQuery({ tripId: parsedTripId }, { enabled: !!parsedTripId });
  const { data: reports = [] } = trpc.chat.listAttachmentReports.useQuery({ tripId: parsedTripId }, { enabled: !!parsedTripId && moderationStatus?.canModerate && reportsOpen });
  const { data: photoActionSummary } = trpc.chat.photoActionSummary.useQuery({ tripId: parsedTripId }, { enabled: !!parsedTripId && moderationStatus?.canModerate && analyticsOpen });
  const { data: photoActionMonthlyTrend = [] } = trpc.chat.photoActionMonthlyTrend.useQuery({ tripId: parsedTripId }, { enabled: !!parsedTripId && moderationStatus?.canModerate && analyticsOpen });
  const { data: moderationAudit = [] } = trpc.chat.listModerationAudit.useQuery({ tripId: parsedTripId }, { enabled: !!parsedTripId && moderationStatus?.canModerate && auditOpen });
  const { data: unreadMentions = [] } = trpc.chat.unreadMentions.useQuery({ tripId: parsedTripId }, { enabled: !!parsedTripId, refetchInterval: 15000 });
  const { data: pinnedMessages = [] } = trpc.chat.pinnedMessages.useQuery({ tripId: parsedTripId }, { enabled: !!parsedTripId && pinnedMessagesOpen });

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
  function updatePendingCaption(index: number, caption: string) {
    setPendingImages((current) => current.map((image, currentIndex) => currentIndex === index ? { ...image, caption } : image));
  }
  function movePendingImage(index: number, direction: -1 | 1) {
    setPendingImages((current) => {
      const destination = index + direction;
      if (destination < 0 || destination >= current.length) return current;
      return reorderTripChatPhotos(current, index, destination);
    });
  }
  function changeViewerImage(direction: -1 | 1) {
    setViewerZoom(1);
    setViewer((current) => {
      if (!current) return null;
      const index = Math.min(Math.max(current.index + direction, 0), current.images.length - 1);
      return { ...current, index };
    });
  }
  function touchDistance(touches: React.TouchList) {
    if (touches.length < 2) return null;
    return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  }
  async function downloadViewerPhoto(image: ViewerImage) {
    try {
      const response = await fetch(image.imageUrl);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "golf-trip-photo";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      if (image.id > 0) recordPhotoActionMutation.mutate({ tripId: parsedTripId, attachmentId: image.id, action: "download" });
    } catch {
      window.open(image.imageUrl, "_blank", "noopener,noreferrer");
      if (image.id > 0) recordPhotoActionMutation.mutate({ tripId: parsedTripId, attachmentId: image.id, action: "download" });
    }
  }
  async function shareViewerPhoto(image: ViewerImage) {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Golf Trip photo", text: image.caption || "Shared from Golf Trip App", url: image.imageUrl });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(image.imageUrl);
        setUploadError("Photo link copied to your clipboard.");
      } else {
        window.open(image.imageUrl, "_blank", "noopener,noreferrer");
      }
      if (image.id > 0) recordPhotoActionMutation.mutate({ tripId: parsedTripId, attachmentId: image.id, action: "share" });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setUploadError("Unable to share this photo. Try downloading it instead.");
    }
  }

  const sendMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      void utils.chat.getMessages.invalidate({ tripId: parsedTripId });
      setMessage("");
      setMentionedUserIds([]);
      setReplyTarget(null);
      clearPendingImages();
    },
  });
  const reactionMutation = trpc.chat.toggleReaction.useMutation({ onSuccess: () => { void utils.chat.getMessages.invalidate({ tripId: parsedTripId }); } });
  const reportMutation = trpc.chat.reportAttachment.useMutation({ onSuccess: () => { setReportingAttachmentId(null); setReportReason(""); setUploadError(null); void utils.chat.listAttachmentReports.invalidate({ tripId: parsedTripId }); } });
  const removeAttachmentMutation = trpc.chat.removeAttachment.useMutation({ onSuccess: () => { void utils.chat.getMessages.invalidate({ tripId: parsedTripId }); void utils.chat.listAttachmentReports.invalidate({ tripId: parsedTripId }); } });
  const dismissReportMutation = trpc.chat.dismissAttachmentReport.useMutation({ onSuccess: () => { void utils.chat.listAttachmentReports.invalidate({ tripId: parsedTripId }); } });
  const updateCaptionMutation = trpc.chat.updateAttachmentCaption.useMutation({ onSuccess: () => { setCaptionEditingAttachment(null); void utils.chat.getMessages.invalidate({ tripId: parsedTripId }); } });
  const deleteOwnAttachmentMutation = trpc.chat.deleteOwnAttachment.useMutation({ onSuccess: () => { setDeletingOwnAttachmentId(null); setViewer(null); void utils.chat.getMessages.invalidate({ tripId: parsedTripId }); } });
  const recordPhotoActionMutation = trpc.chat.recordPhotoAction.useMutation();
  const markMentionsReadMutation = trpc.chat.markMentionsRead.useMutation({ onSuccess: () => void utils.chat.unreadMentions.invalidate({ tripId: parsedTripId }) });
  const setPinnedMutation = trpc.chat.setPinned.useMutation({ onSuccess: () => { void utils.chat.getMessages.invalidate({ tripId: parsedTripId }); void utils.chat.pinnedMessages.invalidate({ tripId: parsedTripId }); } });

  const chooseImages = (files: FileList | null) => {
    setUploadError(null);
    if (!files?.length) return;
    const available = MAX_CHAT_IMAGES - pendingImages.length;
    if (available <= 0) { setUploadError("You can share up to four photos in one message."); return; }
    const selected = Array.from(files).slice(0, available);
    const invalid = selected.find((file) => !isTripChatImageType(file.type) || file.size <= 0 || file.size > TRIP_CHAT_IMAGE_MAX_BYTES);
    if (invalid) { setUploadError("Choose JPEG, PNG, WebP, or GIF photos smaller than 5 MB."); return; }
    setPendingImages((current) => [...current, ...selected.map((file) => ({ file, previewUrl: URL.createObjectURL(file), caption: "" }))]);
    if (files.length > available) setUploadError("Only the first available photos were added; a message can contain up to four.");
  };

  const uploadImage = async (image: PendingImage) => {
    const formData = new FormData();
    formData.append("tripId", String(parsedTripId));
    formData.append("image", image.file);
    const response = await fetch("/api/upload/trip-chat-image", { method: "POST", body: formData });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.url || !payload.key) throw new Error(payload.error || "Image upload failed");
    const caption = normaliseTripChatPhotoCaption(image.caption);
    return { imageUrl: payload.url as string, imageKey: payload.key as string, imageAlt: caption || payload.alt as string || "Trip chat image", caption: caption || undefined };
  };

  const handleSend = async () => {
    const trimmed = message.trim();
    if ((!trimmed && !pendingImages.length) || !parsedTripId || sendMutation.isPending || isUploading) return;
    setUploadError(null);
    try {
      setIsUploading(true);
      const attachments = await Promise.all(pendingImages.map(uploadImage));
      await sendMutation.mutateAsync({ tripId: parsedTripId, message: trimmed, parentMessageId: replyTarget?.id, attachments: attachments.length ? attachments : undefined, mentionedUserIds: mentionedUserIds.length ? mentionedUserIds : undefined });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Message could not be sent. Please try again.");
    } finally { setIsUploading(false); }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void handleSend(); }
  };

  const mentionMatch = message.match(/(?:^|\s)@([^\s@]*)$/);
  const mentionQuery = mentionMatch?.[1]?.toLowerCase() ?? "";
  const mentionSuggestions = mentionMatch ? mentionablePlayers.filter((player) => player.displayName.toLowerCase().includes(mentionQuery) && !mentionedUserIds.includes(player.userId)).slice(0, 5) : [];
  const addMention = (player: { userId: number; displayName: string }) => {
    setMentionedUserIds((current) => [...current, player.userId]);
    setMessage((current) => current.replace(/(^|\s)@[^\s@]*$/, `$1@${player.displayName.replace(/\s+/g, "_")} `));
  };
  const mentionedPlayers = mentionablePlayers.filter((player) => mentionedUserIds.includes(player.userId));
  const { repliesByParent } = groupTripChatThreads(messages);

  if (!parsedTripId) return <div className="flex h-full items-center justify-center text-muted-foreground">No trip selected.</div>;
  const sending = sendMutation.isPending || isUploading;

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col pb-28 sm:pb-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-3">
        <MessageCircle className="h-5 w-5 text-primary" />
        <div className="min-w-0 flex-1"><h1 className="font-semibold text-foreground">Trip Chat</h1><p className="text-xs text-muted-foreground">All players in this trip</p></div>
        <div className="flex w-full flex-wrap items-center gap-1 sm:w-auto"><Button variant="outline" size="sm" onClick={() => { setUnreadMentionsOpen(true); if (unreadMentions.length) markMentionsReadMutation.mutate({ tripId: parsedTripId, mentionIds: unreadMentions.map((mention) => mention.mentionId) }); }} className={`gap-1.5 ${unreadMentions.length ? "border-primary/45 bg-primary/10 text-primary" : ""}`} aria-label="Unread mentions"><AtSign className="h-4 w-4" />{unreadMentions.length > 0 && <span>{unreadMentions.length}</span>}</Button><Button variant="outline" size="sm" onClick={() => setPinnedMessagesOpen(true)} className="gap-1.5" aria-label="Pinned messages"><Pin className="h-4 w-4" /></Button>{moderationStatus?.canModerate && <><Button variant="outline" size="sm" onClick={() => setAnalyticsOpen(true)}>Activity</Button><Button variant="outline" size="sm" onClick={() => setAuditOpen(true)} className="gap-1.5"><ClipboardList className="h-4 w-4" /><span className="hidden sm:inline">Audit</span></Button><Button variant="outline" size="sm" onClick={() => setReportsOpen(true)} className="gap-1.5"><ShieldAlert className="h-4 w-4" />Reports</Button></>}</div>
      </div>

      <div className="border-b border-border bg-card px-4 py-2"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={chatSearch} onChange={(event) => setChatSearch(event.target.value)} placeholder="Search messages or player names" className="h-9 pl-9 text-sm" maxLength={100} /></div></div>

      <ScrollArea className="flex-1 px-4 py-3">
        {isLoading ? <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Loading messages…</div>
          : messages.length === 0 ? <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground"><MessageCircle className="h-8 w-8 opacity-30" /><p className="text-sm">No messages yet. Share an update or photo!</p></div>
            : <div className="flex flex-col gap-4">{messages.map((msg) => {
              const isOwn = user?.id === msg.userId;
              const attachments = msg.attachments.length ? msg.attachments : msg.imageUrl ? [{ id: 0, imageUrl: msg.imageUrl, imageAlt: msg.imageAlt ?? "Trip chat attachment", caption: undefined }] : [];
              const replyCount = repliesByParent.get(msg.id)?.length ?? 0;
              const isReply = msg.parentMessageId !== null;
              return <div key={msg.id} className={`group flex flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"} ${isReply ? "ml-7 border-l-2 border-primary/25 pl-2" : ""}`}>
                {!isOwn && <span className="px-1 text-xs font-medium text-muted-foreground">{msg.userName ?? "Unknown"}</span>}
                <div className={`max-w-[88%] overflow-hidden rounded-2xl text-sm leading-relaxed ${attachments.length ? "p-1" : "px-4 py-2"} ${isOwn ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted text-foreground"}`}>
                  {isReply && <p className={`mb-1 text-[11px] font-medium ${isOwn ? "text-primary-foreground/75" : "text-primary"}`}>Reply in thread</p>}
                  {attachments.length > 0 && <div className={`grid gap-1 ${attachments.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>{attachments.map((attachment, attachmentIndex) => <figure key={attachment.id} className="relative"><div className="relative"><button type="button" onClick={() => { setViewerZoom(1); setViewer({ images: attachments.map((image) => ({ ...image, isOwn })), index: attachmentIndex }); }} className="block w-full" aria-label={`Open photo ${attachmentIndex + 1} full screen`}><img src={attachment.imageUrl} alt={attachment.imageAlt || "Trip chat attachment"} loading="lazy" className={`w-full rounded-xl object-cover ${attachments.length === 1 ? "max-h-80" : "aspect-square"}`} /></button>{attachment.id > 0 && <><Button type="button" variant="secondary" size="icon" onClick={() => setReportingAttachmentId(attachment.id)} className="absolute right-1 top-1 h-7 w-7 rounded-full bg-background/85 shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100" aria-label="Report photo"><Flag className="h-3.5 w-3.5 text-destructive" /></Button>{isOwn && <Button type="button" variant="secondary" size="icon" onClick={() => setCaptionEditingAttachment({ id: attachment.id, caption: attachment.caption || "" })} className="absolute right-9 top-1 h-7 w-7 rounded-full bg-background/85 shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100" aria-label="Edit photo caption"><Pencil className="h-3.5 w-3.5" /></Button>}</>}</div>{attachment.caption && <figcaption className="px-1 pb-1 pt-1 text-xs font-medium leading-snug">{attachment.caption}</figcaption>}</figure>)}</div>}
                  {msg.mentions.length > 0 && <div className={`flex flex-wrap gap-1 ${attachments.length ? "px-2 pt-2" : "mb-1"}`}>{msg.mentions.map((mention) => <span key={mention.userId} className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${isOwn ? "bg-black/15 text-primary-foreground" : "bg-primary/15 text-primary"}`}><AtSign className="h-3 w-3" />{mention.displayName}</span>)}</div>}
                  {msg.message && <p className={attachments.length ? "px-2 pb-2 pt-1" : ""}>{msg.message}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-1 px-1 pt-0.5">
                  {msg.reactions.map((reaction) => <button type="button" key={reaction.emoji} onClick={() => reactionMutation.mutate({ tripId: parsedTripId, messageId: msg.id, emoji: reaction.emoji as typeof REACTION_OPTIONS[number] })} className={`rounded-full border px-1.5 py-0.5 text-xs transition-colors ${reaction.reactedByCurrentUser ? "border-primary bg-primary/15" : "border-border bg-card"}`}>{reaction.emoji} {reaction.count}</button>)}
                  <div className="relative"><Button type="button" variant="ghost" size="icon" onClick={() => setReactionPickerFor(reactionPickerFor === msg.id ? null : msg.id)} className="h-6 w-6 rounded-full transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100" aria-label="Add reaction"><SmilePlus className="h-3.5 w-3.5" /></Button>{reactionPickerFor === msg.id && <div className="absolute bottom-7 left-0 z-10 flex rounded-full border border-border bg-popover p-1 shadow-lg">{REACTION_OPTIONS.map((emoji) => <button key={emoji} type="button" className="rounded-full px-1.5 py-1 hover:bg-muted" onClick={() => { reactionMutation.mutate({ tripId: parsedTripId, messageId: msg.id, emoji }); setReactionPickerFor(null); }}>{emoji}</button>)}</div>}</div>
                  {!isReply && <Button type="button" variant="ghost" size="sm" onClick={() => setReplyTarget({ id: msg.id, userName: msg.userName, message: msg.message })} className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground"><Reply className="h-3.5 w-3.5" />Reply{replyCount > 0 && ` (${replyCount})`}</Button>}
                  {moderationStatus?.canModerate && !isReply && <Button type="button" variant="ghost" size="icon" onClick={() => setPinnedMutation.mutate({ tripId: parsedTripId, messageId: msg.id, pinned: !msg.pinnedAt })} disabled={setPinnedMutation.isPending} className={`h-6 w-6 ${msg.pinnedAt ? "text-primary" : "text-muted-foreground"}`} aria-label={msg.pinnedAt ? "Unpin message" : "Pin message"}>{msg.pinnedAt ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}</Button>}
                </div>
                <span className="px-1 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
              </div>;
            })}<div ref={bottomRef} /></div>}
      </ScrollArea>

      <div className="border-t border-border bg-card px-4 py-3">
        {replyTarget && <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs"><div className="min-w-0"><p className="font-semibold text-primary">Replying to {replyTarget.userName ?? "Trip player"}</p><p className="truncate text-muted-foreground">{replyTarget.message || "Photo message"}</p></div><Button type="button" variant="ghost" size="icon" onClick={() => setReplyTarget(null)} className="h-7 w-7" aria-label="Cancel reply"><X className="h-4 w-4" /></Button></div>}
        {pendingImages.length > 0 && <div className="mb-2 grid grid-cols-2 gap-2">{pendingImages.map((image, index) => <div key={image.previewUrl} className="rounded-xl border border-border bg-muted/25 p-1.5"><div className="relative"><img src={image.previewUrl} alt={`Selected photo ${index + 1}`} className="aspect-square w-full rounded-lg object-cover" /><div className="absolute left-1 top-1 flex gap-1"><Button type="button" variant="secondary" size="icon" onClick={() => movePendingImage(index, -1)} disabled={sending || index === 0} className="h-6 w-6 rounded-full" aria-label={`Move photo ${index + 1} left`}><ArrowLeft className="h-3.5 w-3.5" /></Button><Button type="button" variant="secondary" size="icon" onClick={() => movePendingImage(index, 1)} disabled={sending || index === pendingImages.length - 1} className="h-6 w-6 rounded-full" aria-label={`Move photo ${index + 1} right`}><ArrowRight className="h-3.5 w-3.5" /></Button></div><Button type="button" variant="secondary" size="icon" onClick={() => removePendingImage(index)} disabled={sending} className="absolute right-1 top-1 h-6 w-6 rounded-full"><X className="h-3.5 w-3.5" /></Button></div><Input value={image.caption} onChange={(event) => updatePendingCaption(index, event.target.value)} placeholder={`Caption for photo ${index + 1}`} maxLength={240} disabled={sending} className="mt-1.5 h-8 text-xs" /></div>)}</div>}
        {pendingImages.length > 0 && <p className="mb-2 text-xs text-muted-foreground">{pendingImages.length} of {MAX_CHAT_IMAGES} photos selected — use the arrows to reorder, add individual captions, then optionally add an album comment.</p>}
        {uploadError && <div role="alert" className="mb-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5" />{uploadError}</div>}
        {mentionedPlayers.length > 0 && <div className="mb-2 flex flex-wrap gap-1.5">{mentionedPlayers.map((player) => <button key={player.userId} type="button" onClick={() => setMentionedUserIds((current) => current.filter((id) => id !== player.userId))} className="inline-flex items-center gap-1 rounded-full border border-primary/35 bg-primary/10 px-2 py-1 text-xs font-medium text-primary"><AtSign className="h-3 w-3" />{player.displayName}<X className="h-3 w-3" /></button>)}</div>}
        <div className="relative flex items-center gap-2">
          <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" capture="environment" className="hidden" onChange={(event) => { chooseImages(event.target.files); event.currentTarget.value = ""; }} />
          <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={sending || pendingImages.length >= MAX_CHAT_IMAGES} aria-label="Add photos"><ImagePlus className="h-4 w-4" /></Button>
          <div className="relative flex-1"><Input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={handleKeyDown} placeholder={pendingImages.length ? "Add a comment (optional)…" : "Type a message… Use @ to tag a player"} className="w-full" maxLength={1000} disabled={sending} />{mentionSuggestions.length > 0 && <div className="absolute bottom-11 left-0 z-20 w-full overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl">{mentionSuggestions.map((player) => <button key={player.userId} type="button" onClick={() => addMention(player)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"><AtSign className="h-4 w-4 text-primary" /><span>{player.displayName}</span></button>)}</div>}</div>
          <Button type="button" size="icon" onClick={() => void handleSend()} disabled={(!message.trim() && !pendingImages.length) || sending} className="shrink-0" aria-label="Send message">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
        </div>
      </div>

      <Dialog open={reportingAttachmentId !== null} onOpenChange={(open) => { if (!open) { setReportingAttachmentId(null); setReportReason(""); } }}><DialogContent><DialogHeader><DialogTitle>Report photo</DialogTitle><DialogDescription>Tell the trip admins why this photo should be reviewed. Your report is visible only to moderators.</DialogDescription></DialogHeader><Textarea value={reportReason} onChange={(event) => setReportReason(event.target.value)} placeholder="Optional reason" maxLength={600} /><DialogFooter><Button variant="outline" onClick={() => setReportingAttachmentId(null)}>Cancel</Button><Button variant="destructive" disabled={reportMutation.isPending} onClick={() => reportingAttachmentId && reportMutation.mutate({ tripId: parsedTripId, attachmentId: reportingAttachmentId, reason: reportReason.trim() || undefined })}>{reportMutation.isPending ? "Sending…" : "Send report"}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={reportsOpen} onOpenChange={setReportsOpen}><DialogContent className="max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Attachment reports</DialogTitle><DialogDescription>Review reported Trip Chat photos. Removing hides the image for all players.</DialogDescription></DialogHeader>{reports.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No attachment reports.</p> : <div className="space-y-3">{reports.map((entry) => <div key={entry.report.id} className="rounded-xl border border-border p-3"><div className="flex gap-3"><img src={entry.attachment.imageUrl} alt={entry.attachment.imageAlt || "Reported attachment"} className="h-16 w-16 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{entry.reporterName || "Trip player"} reported this photo</p><p className="line-clamp-2 text-xs text-muted-foreground">{entry.report.reason || "No reason provided"}</p><p className="mt-1 text-xs capitalize text-muted-foreground">Status: {entry.report.status}</p></div></div>{entry.report.status === "open" && <div className="mt-3 flex justify-end gap-2"><Button size="sm" variant="outline" disabled={dismissReportMutation.isPending} onClick={() => dismissReportMutation.mutate({ tripId: parsedTripId, reportId: entry.report.id })}>Dismiss</Button><Button size="sm" variant="destructive" disabled={removeAttachmentMutation.isPending} onClick={() => removeAttachmentMutation.mutate({ tripId: parsedTripId, attachmentId: entry.attachment.id })}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Remove photo</Button></div>}</div>)}</div>}</DialogContent></Dialog>

      <Dialog open={unreadMentionsOpen} onOpenChange={setUnreadMentionsOpen}><DialogContent className="max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Unread mentions</DialogTitle><DialogDescription>Messages where another trip player tagged you.</DialogDescription></DialogHeader>{unreadMentions.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">You are all caught up.</p> : <div className="space-y-3">{unreadMentions.map((entry) => <div key={entry.mentionId} className="rounded-xl border border-primary/25 bg-primary/5 p-3"><p className="text-xs font-semibold text-primary">@ mention from {entry.authorNickname ?? entry.authorName ?? "Trip player"}</p><p className="mt-1 text-sm text-foreground">{entry.message.message || "Photo message"}</p><p className="mt-1 text-xs text-muted-foreground">{formatDistanceToNow(new Date(entry.message.createdAt), { addSuffix: true })}</p></div>)}</div>}</DialogContent></Dialog>

      <Dialog open={pinnedMessagesOpen} onOpenChange={setPinnedMessagesOpen}><DialogContent className="max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Pinned messages</DialogTitle><DialogDescription>Important updates saved by a trip moderator.</DialogDescription></DialogHeader>{pinnedMessages.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No messages are pinned yet.</p> : <div className="space-y-3">{pinnedMessages.map((entry) => <div key={entry.message.id} className="rounded-xl border border-primary/25 bg-primary/5 p-3"><div className="flex items-center gap-1 text-xs font-semibold text-primary"><Pin className="h-3.5 w-3.5" />{entry.authorNickname ?? entry.authorName ?? "Trip moderator"}</div><p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{entry.message.message || "Photo message"}</p><p className="mt-1 text-xs text-muted-foreground">Pinned {entry.message.pinnedAt ? formatDistanceToNow(new Date(entry.message.pinnedAt), { addSuffix: true }) : "recently"}</p></div>)}</div>}</DialogContent></Dialog>

      <Dialog open={auditOpen} onOpenChange={setAuditOpen}><DialogContent className="max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Moderation audit</DialogTitle><DialogDescription>Records of moderator decisions for Trip Chat photos.</DialogDescription></DialogHeader>{moderationAudit.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No moderation actions have been recorded.</p> : <div className="space-y-3">{moderationAudit.map((entry) => <div key={entry.audit.id} className="flex gap-3 rounded-xl border border-border p-3"><img src={entry.attachment.imageUrl} alt={entry.attachment.imageAlt || "Moderated attachment"} className="h-14 w-14 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{entry.audit.action === "attachment_removed" ? "Photo removed" : "Report dismissed"}</p><p className="text-xs text-muted-foreground">By {entry.actorName || "Trip moderator"} · {formatDistanceToNow(new Date(entry.audit.createdAt), { addSuffix: true })}</p></div></div>)}</div>}</DialogContent></Dialog>

      <Dialog open={analyticsOpen} onOpenChange={setAnalyticsOpen}><DialogContent className="max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Photo activity</DialogTitle><DialogDescription>Anonymous trip-level totals only. Individual player activity is not collected or shown.</DialogDescription></DialogHeader><div className="grid grid-cols-3 gap-3"><div className="rounded-xl border border-border p-3 text-center"><p className="text-lg font-bold">{photoActionSummary?.downloads ?? 0}</p><p className="text-xs text-muted-foreground">Downloads</p></div><div className="rounded-xl border border-border p-3 text-center"><p className="text-lg font-bold">{photoActionSummary?.shares ?? 0}</p><p className="text-xs text-muted-foreground">Shares</p></div><div className="rounded-xl border border-border p-3 text-center"><p className="text-lg font-bold">{photoActionSummary?.total ?? 0}</p><p className="text-xs text-muted-foreground">Total actions</p></div></div><div className="mt-5"><h3 className="text-sm font-semibold">Monthly trend</h3>{photoActionMonthlyTrend.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No photo activity yet.</p> : <div className="mt-3 space-y-3">{photoActionMonthlyTrend.map((entry) => { const max = Math.max(...photoActionMonthlyTrend.map((item) => item.total), 1); return <div key={entry.month}><div className="mb-1 flex justify-between text-xs"><span>{new Date(`${entry.month}-01T12:00:00`).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span><span className="text-muted-foreground">{entry.downloads} downloads · {entry.shares} shares</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(entry.total / max) * 100}%` }} /></div></div>; })}</div>}</div></DialogContent></Dialog>

      <Dialog open={captionEditingAttachment !== null} onOpenChange={(open) => { if (!open) setCaptionEditingAttachment(null); }}><DialogContent><DialogHeader><DialogTitle>Edit photo caption</DialogTitle><DialogDescription>Only you can edit captions on photos you posted.</DialogDescription></DialogHeader><Textarea value={captionEditingAttachment?.caption || ""} onChange={(event) => setCaptionEditingAttachment((current) => current ? { ...current, caption: event.target.value } : null)} placeholder="Add a caption (optional)" maxLength={240} /><DialogFooter><Button variant="outline" onClick={() => setCaptionEditingAttachment(null)}>Cancel</Button><Button disabled={updateCaptionMutation.isPending} onClick={() => captionEditingAttachment && updateCaptionMutation.mutate({ tripId: parsedTripId, attachmentId: captionEditingAttachment.id, caption: captionEditingAttachment.caption.trim() || undefined })}>{updateCaptionMutation.isPending ? "Saving…" : "Save caption"}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={viewer !== null} onOpenChange={(open) => { if (!open) { setViewer(null); setViewerZoom(1); } }}>
        <DialogContent className="h-[100dvh] max-w-none rounded-none border-0 bg-black p-3 text-white sm:h-[92vh] sm:max-w-4xl sm:rounded-xl">
          <DialogTitle className="sr-only">Trip Chat photo viewer</DialogTitle>
          {viewer && <div
            className="relative flex h-full min-h-0 flex-col"
            onTouchStart={(event) => {
              const distance = touchDistance(event.touches);
              if (distance) { viewerPinchStart.current = distance; viewerPinchBase.current = viewerZoom; viewerTouchStart.current = null; }
              else viewerTouchStart.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchMove={(event) => {
              const distance = touchDistance(event.touches);
              if (distance && viewerPinchStart.current) setViewerZoom(Math.min(3, Math.max(1, viewerPinchBase.current * distance / viewerPinchStart.current)));
            }}
            onTouchEnd={(event) => {
              if (viewerPinchStart.current) { viewerPinchStart.current = null; return; }
              const start = viewerTouchStart.current;
              const end = event.changedTouches[0]?.clientX;
              viewerTouchStart.current = null;
              if (start === null || end === undefined || viewerZoom > 1) return;
              const delta = end - start;
              if (Math.abs(delta) >= 44) changeViewerImage(delta < 0 ? 1 : -1);
            }}
          >
            <div className="flex items-center justify-between gap-3 pb-2">
              <span className="text-sm font-medium">Photo {viewer.index + 1} of {viewer.images.length}</span>
              <div className="flex items-center gap-1">
                <Button type="button" variant="secondary" size="icon" onClick={() => void downloadViewerPhoto(viewer.images[viewer.index])} className="rounded-full" aria-label="Download photo"><Download className="h-4 w-4" /></Button>
                <Button type="button" variant="secondary" size="icon" onClick={() => void shareViewerPhoto(viewer.images[viewer.index])} className="rounded-full" aria-label="Share photo"><Share2 className="h-4 w-4" /></Button>
                {viewerZoom > 1 && <Button type="button" variant="secondary" size="icon" onClick={() => setViewerZoom(1)} className="rounded-full" aria-label="Reset zoom"><RotateCcw className="h-4 w-4" /></Button>}
                {viewer.images[viewer.index].isOwn && viewer.images[viewer.index].id > 0 && <Button type="button" variant="destructive" size="icon" onClick={() => setDeletingOwnAttachmentId(viewer.images[viewer.index].id)} className="rounded-full" aria-label="Remove my photo"><Trash2 className="h-4 w-4" /></Button>}
                <Button type="button" variant="secondary" size="icon" onClick={() => { setViewer(null); setViewerZoom(1); }} className="rounded-full" aria-label="Close photo viewer"><X className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
              <img src={viewer.images[viewer.index].imageUrl} alt={viewer.images[viewer.index].imageAlt || "Trip chat photo"} style={{ transform: `scale(${viewerZoom})` }} className="max-h-full max-w-full object-contain transition-transform duration-150" />
              {viewer.images.length > 1 && viewerZoom === 1 && <>
                <Button type="button" variant="secondary" size="icon" disabled={viewer.index === 0} onClick={() => changeViewerImage(-1)} className="absolute left-1 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-background/85" aria-label="Previous photo"><ChevronLeft className="h-5 w-5" /></Button>
                <Button type="button" variant="secondary" size="icon" disabled={viewer.index === viewer.images.length - 1} onClick={() => changeViewerImage(1)} className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-background/85" aria-label="Next photo"><ChevronRight className="h-5 w-5" /></Button>
              </>}
            </div>
            {viewer.images[viewer.index].caption && <p className="px-2 pt-3 text-center text-sm leading-relaxed text-white/90">{viewer.images[viewer.index].caption}</p>}
            <p className="pb-1 pt-2 text-center text-xs text-white/60">Pinch to zoom · swipe left or right to browse</p>
          </div>}
        </DialogContent>
      </Dialog>

      <Dialog open={deletingOwnAttachmentId !== null} onOpenChange={(open) => { if (!open) setDeletingOwnAttachmentId(null); }}><DialogContent><DialogHeader><DialogTitle>Remove this photo?</DialogTitle><DialogDescription>This hides the photo from everyone in the trip chat. It cannot be restored from the chat.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeletingOwnAttachmentId(null)}>Cancel</Button><Button variant="destructive" disabled={deleteOwnAttachmentMutation.isPending} onClick={() => deletingOwnAttachmentId && deleteOwnAttachmentMutation.mutate({ tripId: parsedTripId, attachmentId: deletingOwnAttachmentId })}>{deleteOwnAttachmentMutation.isPending ? "Removing…" : "Remove photo"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
