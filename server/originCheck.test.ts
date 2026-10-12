import { describe, expect, it } from "vitest";
import { isAllowedOrigin } from "./originCheck";

describe("isAllowedOrigin", () => {
  it("accepts the same host and rejects another", () => {
    expect(isAllowedOrigin({ origin: "https://app.example.com", host: "app.example.com" })).toBe(true);
    expect(isAllowedOrigin({ origin: "https://evil.example", host: "app.example.com" })).toBe(false);
  });
  it("accepts the public host when a proxy rewrites Host", () => {
    expect(isAllowedOrigin({ origin: "https://app.example.com", host: "10.0.0.5:3000" })).toBe(false);
    expect(isAllowedOrigin({ origin: "https://app.example.com", host: "10.0.0.5:3000", forwardedHost: "app.example.com" })).toBe(true);
    expect(isAllowedOrigin({ origin: "https://app.example.com", host: "10.0.0.5:3000", publicAppUrl: "https://app.example.com" })).toBe(true);
  });
  it("rejects malformed origins and cross-site requests with no origin", () => {
    expect(isAllowedOrigin({ origin: "not a url", host: "a.com" })).toBe(false);
    expect(isAllowedOrigin({ host: "a.com", secFetchSite: "cross-site" })).toBe(false);
    expect(isAllowedOrigin({ host: "a.com", secFetchSite: "same-origin" })).toBe(true);
    expect(isAllowedOrigin({ host: "a.com" })).toBe(true);
  });
});
