import { describe, expect, it } from "vitest";
import { MAX_TRIP_CHAT_IMAGES, canManageTripChatAttachment, isTripChatReactionEmoji, normaliseTripChatPhotoCaption, remainingTripChatImageSlots, reorderTripChatPhotos } from "../shared/tripChatAlbum";

describe("Trip Chat albums and reactions", () => {
  it("limits a chat album to four images", () => {
    expect(MAX_TRIP_CHAT_IMAGES).toBe(4);
    expect(remainingTripChatImageSlots(0)).toBe(4);
    expect(remainingTripChatImageSlots(3)).toBe(1);
    expect(remainingTripChatImageSlots(4)).toBe(0);
    expect(remainingTripChatImageSlots(7)).toBe(0);
  });

  it("allows only the compact supported reaction set", () => {
    expect(isTripChatReactionEmoji("👍")).toBe(true);
    expect(isTripChatReactionEmoji("⛳")).toBe(true);
    expect(isTripChatReactionEmoji("🔥")).toBe(false);
    expect(isTripChatReactionEmoji("like")).toBe(false);
  });

  it("trims individual photo captions and treats blank captions as absent", () => {
    expect(normaliseTripChatPhotoCaption("  First tee selfie  ")).toBe("First tee selfie");
    expect(normaliseTripChatPhotoCaption("   ")).toBeUndefined();
  });

  it("moves an album photo without mutating the original order", () => {
    const original = ["first", "second", "third"];
    expect(reorderTripChatPhotos(original, 0, 2)).toEqual(["second", "third", "first"]);
    expect(reorderTripChatPhotos(original, 2, 0)).toEqual(["third", "first", "second"]);
    expect(original).toEqual(["first", "second", "third"]);
  });

  it("allows only an attachment author to manage their photo", () => {
    expect(canManageTripChatAttachment(12, 12)).toBe(true);
    expect(canManageTripChatAttachment(12, 19)).toBe(false);
  });
});
