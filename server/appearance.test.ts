import { describe, expect, it } from "vitest";
import { resolveAppColorScheme, resolveEffectiveAppColorScheme } from "../shared/appearance";

describe("appearance preferences", () => {
  it("uses supported saved colour schemes and safely falls back to fairway", () => {
    expect(resolveAppColorScheme("ocean")).toBe("ocean");
    expect(resolveAppColorScheme("sand")).toBe("sand");
    expect(resolveAppColorScheme("system")).toBe("system");
    expect(resolveAppColorScheme("unknown")).toBe("fairway");
    expect(resolveAppColorScheme(null)).toBe("fairway");
  });

  it("resolves system appearance from the device preference", () => {
    expect(resolveEffectiveAppColorScheme("system", true)).toBe("fairway");
    expect(resolveEffectiveAppColorScheme("system", false)).toBe("sand");
    expect(resolveEffectiveAppColorScheme("ocean", false)).toBe("ocean");
  });
});
