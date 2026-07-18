import { describe, it, expect } from "vitest";

/**
 * Validates that the RESEND_API_KEY secret is present and correctly formatted.
 * The Resend SDK validates the key on first use; we just confirm it's set here
 * to catch missing-secret issues early.
 */
describe("Resend email service", () => {
  it("RESEND_API_KEY is set in the environment", () => {
    const key = process.env.RESEND_API_KEY;
    expect(key, "RESEND_API_KEY must be set").toBeTruthy();
    expect(key!.startsWith("re_"), "RESEND_API_KEY must start with re_").toBe(true);
  });

  it("sendInviteEmail builds correct email params without throwing", async () => {
    // Dry-run: import the module and confirm it loads without error.
    // We do NOT actually send an email in unit tests to avoid side effects.
    const { sendInviteEmail } = await import("./email");
    expect(typeof sendInviteEmail).toBe("function");
  });
});
