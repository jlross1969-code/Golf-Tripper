import { describe, expect, it } from "vitest";
import { matchHandicapRows, parseHandicapCsv } from "../shared/handicapImport";

describe("handicap import", () => {
  it("parses csv, skipping headers and blanks", () => {
    expect(parseHandicapCsv("Name,Handicap\nJohn Ross, 12.4\n\nsam@x.com;8")).toEqual([
      { identifier: "John Ross", handicap: 12.4 },
      { identifier: "sam@x.com", handicap: 8 },
    ]);
  });

  it("matches by email or name and flags problems", () => {
    const players = [
      { userId: 1, email: "sam@x.com", name: "Sam Lee" },
      { userId: 2, name: "Pat Kim", nickname: "Pat" },
      { userId: 3, name: "Pat Kim" },
    ];
    const result = matchHandicapRows(
      [{ identifier: "SAM@x.com", handicap: 8 }, { identifier: "Pat Kim", handicap: 10 }, { identifier: "Nobody", handicap: 5 }, { identifier: "Sam Lee", handicap: 99 }],
      players,
    );
    expect(result.map((r) => r.status)).toEqual(["matched", "ambiguous", "unmatched", "invalid"]);
  });
});
