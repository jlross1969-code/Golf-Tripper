import { describe, expect, it } from "vitest";
import { TRIP_CHAT_IMAGE_MAX_BYTES, isTripChatImageReference, isValidTripChatImageFile } from "../shared/tripChatAttachment";

describe("Trip Chat image attachments", () => {
  it("accepts supported image files within the 5 MB limit", () => {
    expect(isValidTripChatImageFile({ type: "image/jpeg", size: 1_024 } as File)).toBe(true);
    expect(isValidTripChatImageFile({ type: "image/webp", size: TRIP_CHAT_IMAGE_MAX_BYTES } as File)).toBe(true);
  });

  it("rejects unsupported, empty, and oversized attachments", () => {
    expect(isValidTripChatImageFile({ type: "image/svg+xml", size: 1_024 } as File)).toBe(false);
    expect(isValidTripChatImageFile({ type: "image/png", size: 0 } as File)).toBe(false);
    expect(isValidTripChatImageFile({ type: "image/png", size: TRIP_CHAT_IMAGE_MAX_BYTES + 1 } as File)).toBe(false);
  });

  it("only accepts a storage reference in the Trip Chat namespace", () => {
    expect(isTripChatImageReference("/manus-storage/trip-chat/2/4/10.jpg", "trip-chat/2/4/10.jpg")).toBe(true);
    expect(isTripChatImageReference("https://example.com/image.jpg", "trip-chat/2/4/10.jpg")).toBe(false);
    expect(isTripChatImageReference("/manus-storage/profile-photos/4.jpg", "profile-photos/4.jpg")).toBe(false);
  });
});
