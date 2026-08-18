import { describe, expect, it } from "vitest";
import { MAX_TRIP_CHAT_IMAGES, isTripChatReactionEmoji, remainingTripChatImageSlots } from "../shared/tripChatAlbum";

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
});
