export const TRIP_CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const TRIP_CHAT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export function isTripChatImageType(value: string): boolean {
  return (TRIP_CHAT_IMAGE_TYPES as readonly string[]).includes(value);
}

export function isValidTripChatImageFile(file: Pick<File, "type" | "size">): boolean {
  return isTripChatImageType(file.type) && file.size > 0 && file.size <= TRIP_CHAT_IMAGE_MAX_BYTES;
}

export function isTripChatImageReference(imageUrl?: string, imageKey?: string): boolean {
  return Boolean(imageUrl?.startsWith("/manus-storage/trip-chat/") && imageKey?.startsWith("trip-chat/"));
}
