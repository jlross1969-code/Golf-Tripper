import { describe, expect, it } from "vitest";
import { calculateCountback, compareCountback } from "../shared/countback";

const values = (amounts: Record<number, number>) =>
  Array.from({ length: 18 }, (_, index) => ({ holeNumber: index + 1, value: amounts[index + 1] ?? 0 }));

describe("standard golf countback", () => {
  it("calculates back nine, last six, last three, and hole 18", () => {
    const countback = calculateCountback(values({ 10: 2, 11: 2, 12: 2, 13: 3, 14: 3, 15: 3, 16: 4, 17: 4, 18: 4 }));
    expect(countback).toEqual({ back9: 27, last6: 21, last3: 12, hole18: 4 });
  });

  it("uses higher points to break Stableford ties", () => {
    const left = calculateCountback(values({ 10: 3, 11: 3, 12: 3, 13: 3, 14: 3, 15: 3, 16: 3, 17: 3, 18: 3 }));
    const right = calculateCountback(values({ 10: 2, 11: 2, 12: 2, 13: 2, 14: 2, 15: 2, 16: 2, 17: 2, 18: 2 }));
    expect(compareCountback(left, right, "higher")).toBeLessThan(0);
  });

  it("uses lower net score to break Stroke ties", () => {
    const left = calculateCountback(values({ 10: 4, 11: 4, 12: 4, 13: 4, 14: 4, 15: 4, 16: 4, 17: 4, 18: 4 }));
    const right = calculateCountback(values({ 10: 5, 11: 5, 12: 5, 13: 5, 14: 5, 15: 5, 16: 5, 17: 5, 18: 5 }));
    expect(compareCountback(left, right, "lower")).toBeLessThan(0);
  });

  it("does not count back an incomplete segment", () => {
    const countback = calculateCountback([{ holeNumber: 18, value: 2 }]);
    expect(countback).toEqual({ back9: null, last6: null, last3: null, hole18: 2 });
  });
});
