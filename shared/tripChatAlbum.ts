export const MAX_TRIP_CHAT_IMAGES = 4;
export const TRIP_CHAT_REACTION_OPTIONS = ["👍", "❤️", "😂", "⛳"] as const;
export type TripChatReactionEmoji = typeof TRIP_CHAT_REACTION_OPTIONS[number];

export function remainingTripChatImageSlots(selectedCount: number): number {
  return Math.max(0, MAX_TRIP_CHAT_IMAGES - Math.max(0, selectedCount));
}

export function isTripChatReactionEmoji(value: string): value is TripChatReactionEmoji {
  return (TRIP_CHAT_REACTION_OPTIONS as readonly string[]).includes(value);
}
