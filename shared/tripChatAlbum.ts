export const MAX_TRIP_CHAT_IMAGES = 4;
export const TRIP_CHAT_REACTION_OPTIONS = ["👍", "❤️", "😂", "⛳"] as const;
export type TripChatReactionEmoji = typeof TRIP_CHAT_REACTION_OPTIONS[number];

export function remainingTripChatImageSlots(selectedCount: number): number {
  return Math.max(0, MAX_TRIP_CHAT_IMAGES - Math.max(0, selectedCount));
}

export function isTripChatReactionEmoji(value: string): value is TripChatReactionEmoji {
  return (TRIP_CHAT_REACTION_OPTIONS as readonly string[]).includes(value);
}

export function normaliseTripChatPhotoCaption(value: string): string | undefined {
  const caption = value.trim();
  return caption || undefined;
}

export function reorderTripChatPhotos<T>(photos: readonly T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= photos.length || toIndex >= photos.length || fromIndex === toIndex) return [...photos];
  const reordered = [...photos];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  return reordered;
}

export function canManageTripChatAttachment(authorUserId: number, currentUserId: number): boolean {
  return authorUserId === currentUserId;
}
