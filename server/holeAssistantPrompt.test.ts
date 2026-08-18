import { describe, expect, it } from "vitest";
import { buildHoleAssistantPrompt } from "../shared/holeAssistantPrompt";

describe("hole assistant prompt", () => {
  it("includes the selected player, hole, score, and scoring context", () => {
    const prompt = buildHoleAssistantPrompt({ playerName: "Gally", roundName: "CITI Day 2", holeNumber: 7, par: 4, strokeIndex: 3, grossScore: 5, netScore: 4, stablefordPoints: 2 });
    expect(prompt).toContain("Gally");
    expect(prompt).toContain("CITI Day 2");
    expect(prompt).toContain("Hole 7, par 4, stroke index 3");
    expect(prompt).toContain("5 gross, 4 net, 2 Stableford points");
  });
});
