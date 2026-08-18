import { describe, expect, it } from "vitest";
import { resolveAppColorScheme } from "../shared/appearance";

describe("appearance preferences", () => {
  it("uses supported saved colour schemes and safely falls back to fairway", () => {
    expect(resolveAppColorScheme("ocean")).toBe("ocean");
    expect(resolveAppColorScheme("sand")).toBe("sand");
    expect(resolveAppColorScheme("unknown")).toBe("fairway");
    expect(resolveAppColorScheme(null)).toBe("fairway");
  });
});
