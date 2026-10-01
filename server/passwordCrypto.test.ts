import { describe, expect, it } from "vitest";
import { hashPassword, hashToken, isEmail, newToken, validatePassword, verifyPassword } from "./passwordCrypto";

describe("password crypto", () => {
  it("verifies the right password only and salts each hash", async () => {
    const a = await hashPassword("correct horse battery");
    const b = await hashPassword("correct horse battery");
    expect(a).not.toBe(b);
    expect(await verifyPassword("correct horse battery", a)).toBe(true);
    expect(await verifyPassword("wrong password here", a)).toBe(false);
    expect(await verifyPassword("anything", "garbage")).toBe(false);
  });

  it("stores only a hash of tokens", () => {
    const { token, tokenHash } = newToken();
    expect(tokenHash).toBe(hashToken(token));
    expect(tokenHash).not.toContain(token);
  });

  it("enforces a password policy and email shape", () => {
    expect(validatePassword("short")).not.toBeNull();
    expect(validatePassword("aaaaaaaaaaaa")).not.toBeNull();
    expect(validatePassword("a reasonable passphrase")).toBeNull();
    expect(isEmail("a@b.co")).toBe(true);
    expect(isEmail("nope")).toBe(false);
  });
});
