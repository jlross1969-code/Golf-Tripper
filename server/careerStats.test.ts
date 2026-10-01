import { describe, expect, it } from "vitest";
import { summariseCareer } from "../shared/careerStats";

const r = (roundId: number, points: number, holesPlayed = 18, tripId = 1) => ({ roundId, tripId, tripName: `T${tripId}`, date: new Date(2026, 0, roundId), points, gross: 90 + roundId, holesPlayed });

describe("summariseCareer", () => {
  it("ignores partial cards and finds the best full round", () => {
    const s = summariseCareer([r(1, 30), r(2, 38), r(3, 5, 4)]);
    expect(s.roundsPlayed).toBe(2);
    expect(s.averagePoints).toBe(34);
    expect(s.bestRound?.roundId).toBe(2);
  });
  it("handles no rounds", () => {
    const s = summariseCareer([]);
    expect(s.roundsPlayed).toBe(0);
    expect(s.bestRound).toBeNull();
    expect(s.averagePoints).toBeNull();
  });
  it("groups by trip", () => {
    const s = summariseCareer([r(1, 30, 18, 1), r(2, 20, 18, 2), r(3, 25, 18, 1)]);
    expect(s.perTrip[0]).toMatchObject({ tripId: 1, rounds: 2, points: 55 });
  });
});
