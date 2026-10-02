import { and, eq, isNull } from "drizzle-orm";
import { tripMessageAttachments, tripMessages } from "../drizzle/schema";
import type { GalleryPhoto } from "../shared/gallery";
import { getDb } from "./db";

/** Photos shared in trip chat (single-image messages and multi-image attachments), excluding deleted/removed ones. */
export async function getTripPhotos(tripId: number): Promise<GalleryPhoto[]> {
  const db = await getDb();
  if (!db) return [];
  const single = await db.select().from(tripMessages).where(and(eq(tripMessages.tripId, tripId), isNull(tripMessages.deletedAt)));
  const attached = await db
    .select({ attachment: tripMessageAttachments, userId: tripMessages.userId })
    .from(tripMessageAttachments)
    .innerJoin(tripMessages, eq(tripMessages.id, tripMessageAttachments.messageId))
    .where(and(eq(tripMessages.tripId, tripId), isNull(tripMessages.deletedAt), eq(tripMessageAttachments.isRemoved, false)));
  const photos: GalleryPhoto[] = [];
  for (const m of single) {
    if (m.imageUrl || m.imageKey) photos.push({ id: `m${m.id}`, url: m.imageUrl ?? `/manus-storage/${m.imageKey}`, alt: m.imageAlt, caption: null, takenAt: m.createdAt, userId: m.userId });
  }
  for (const { attachment, userId } of attached) {
    photos.push({ id: `a${attachment.id}`, url: attachment.imageUrl, alt: attachment.imageAlt, caption: attachment.caption, takenAt: attachment.createdAt, userId });
  }
  return photos;
}
