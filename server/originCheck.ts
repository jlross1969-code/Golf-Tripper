export type OriginInput = {
  origin?: string;
  host?: string;
  forwardedHost?: string;
  publicAppUrl?: string;
  secFetchSite?: string;
};

/**
 * Decides whether a state-changing request may proceed. The app host can legitimately differ from
 * the Host header behind a proxy, so the forwarded host and the configured public URL also count.
 */
export function isAllowedOrigin(input: OriginInput): boolean {
  if (!input.origin) {
    // Browsers always send Origin on cross-site POSTs; Sec-Fetch-Site backs that up when it is present.
    return input.secFetchSite !== "cross-site";
  }
  let originHost: string;
  try {
    originHost = new URL(input.origin).host.toLowerCase();
  } catch {
    return false;
  }
  const allowed = new Set<string>();
  if (input.host) allowed.add(input.host.toLowerCase());
  if (input.forwardedHost) allowed.add(input.forwardedHost.split(",")[0].trim().toLowerCase());
  if (input.publicAppUrl) {
    try { allowed.add(new URL(input.publicAppUrl).host.toLowerCase()); } catch { /* ignore a malformed setting */ }
  }
  return allowed.has(originHost);
}
