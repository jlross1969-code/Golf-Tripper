import { describe, expect, it } from "vitest";
import { matchesSignature, safeExtension } from "./uploadSecurity";

describe("upload security", () => {
  it("accepts matching signatures and rejects mismatches", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]);
    expect(matchesSignature(png, "image/png")).toBe(true);
    expect(matchesSignature(png, "image/jpeg")).toBe(false);
    expect(matchesSignature(Buffer.from("<svg onload=alert(1)>"), "image/png")).toBe(false);
    expect(matchesSignature(Buffer.from("%PDF-1.7"), "application/pdf")).toBe(true);
  });

  it("derives extensions from an allow-list only", () => {
    expect(safeExtension("image/jpeg")).toBe("jpg");
    expect(safeExtension("image/svg+xml")).toBe("bin");
    expect(safeExtension("text/html")).toBe("bin");
  });
});
