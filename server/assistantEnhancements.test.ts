import { describe, expect, it } from "vitest";
import { createAssistantConversationTitle, formatTripFaqContext } from "../shared/assistantEnhancements";

describe("Golf Trip AI assistant enhancements", () => {
  it("creates concise saved-chat titles from a question", () => {
    expect(createAssistantConversationTitle("  How   does  countback  work? ")).toBe("How does countback work?");
    expect(createAssistantConversationTitle("x".repeat(80))).toHaveLength(70);
  });

  it("formats administrator FAQs as explicit trip-specific assistant context", () => {
    expect(formatTripFaqContext([{ question: "What tees?", answer: "Blue tees.", category: "local_rules", isPinned: true }])).toContain("[Pinned · local_rules] Q: What tees?\nA: Blue tees.");
    expect(formatTripFaqContext([])).toBe("");
  });
});
