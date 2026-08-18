import { describe, expect, it } from "vitest";
import { groupTripChatThreads } from "../shared/tripChatThread";

describe("Trip Chat threads", () => {
  it("keeps root messages separate and groups replies by their parent", () => {
    const grouped = groupTripChatThreads([{ id: 1, parentMessageId: null }, { id: 2, parentMessageId: 1 }, { id: 3, parentMessageId: null }]);
    expect(grouped.roots.map((message) => message.id)).toEqual([1, 3]);
    expect(grouped.repliesByParent.get(1)?.map((message) => message.id)).toEqual([2]);
  });
});
