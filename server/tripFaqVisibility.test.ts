import { describe, expect, it } from "vitest";
import { filterTripFaqsForRound, isTripFaqVisibleForRound } from "../shared/tripFaqVisibility";

const rounds = [
  { id: 10, roundDate: "2026-07-27T00:00:00.000Z" },
  { id: 20, roundDate: "2026-07-28T00:00:00.000Z" },
  { id: 30, roundDate: "2026-07-29T00:00:00.000Z" },
];

describe("trip FAQ round visibility", () => {
  it("keeps unscheduled FAQs visible before the first round", () => {
    expect(isTripFaqVisibleForRound({ visibleFromRoundId: null }, rounds)).toBe(true);
    expect(isTripFaqVisibleForRound({ visibleFromRoundId: 20 }, rounds)).toBe(false);
  });

  it("reveals an FAQ at its selected round and keeps it visible later", () => {
    const faqs = [{ id: 1, visibleFromRoundId: null }, { id: 2, visibleFromRoundId: 20 }];
    expect(filterTripFaqsForRound(faqs, rounds, 10).map((faq) => faq.id)).toEqual([1]);
    expect(filterTripFaqsForRound(faqs, rounds, 20).map((faq) => faq.id)).toEqual([1, 2]);
    expect(filterTripFaqsForRound(faqs, rounds, 30).map((faq) => faq.id)).toEqual([1, 2]);
  });
});
