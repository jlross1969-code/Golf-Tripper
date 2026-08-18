import { describe, expect, it } from "vitest";
import { copyAppearanceDateToTrip, SEASONAL_APPEARANCE_TEMPLATES } from "../shared/seasonalAppearanceTemplates";

describe("seasonal appearance templates", () => {
  it("offers the four available app colour schemes as seasonal starting points", () => {
    expect(SEASONAL_APPEARANCE_TEMPLATES.map((template) => template.colorScheme)).toEqual(["fairway", "ocean", "sand", "plum"]);
  });

  it("copies scheduled themes by their relative trip day", () => {
    expect(copyAppearanceDateToTrip("2026-07-29T12:00:00.000Z", "2026-07-27T12:00:00.000Z", "2026-10-10T12:00:00.000Z").toISOString()).toBe("2026-10-12T12:00:00.000Z");
  });
});
