import { describe, expect, it } from "vitest";
import { normaliseTripChatMentionedUserIds } from "../shared/tripChatMention";

describe("Trip Chat mentions", () => {
  it("removes duplicate, invalid, and self-mentions while preserving selected players", () => {
    expect(normaliseTripChatMentionedUserIds([2, 2, 1, -4, 3.5, 4], 1)).toEqual([2, 4]);
  });
});
