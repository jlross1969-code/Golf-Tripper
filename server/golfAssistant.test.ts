import { describe, expect, it } from "vitest";
import { recentGolfAssistantMessages } from "../shared/golfAssistant";

describe("Golf Trip AI assistant history", () => {
  it("keeps the most recent conversation messages within the history limit", () => {
    const messages = Array.from({ length: 12 }, (_, index) => ({
      role: index % 2 === 0 ? "user" as const : "assistant" as const,
      content: `Message ${index + 1}`,
    }));

    const result = recentGolfAssistantMessages(messages, 10);

    expect(result).toHaveLength(10);
    expect(result[0].content).toBe("Message 3");
    expect(result[9].content).toBe("Message 12");
  });

  it("preserves a shorter conversation unchanged", () => {
    const messages = [{ role: "user" as const, content: "How does Stableford work?" }];
    expect(recentGolfAssistantMessages(messages)).toEqual(messages);
  });
});
