// Helpers for "send the user back where they were going after login/signup/verify".
//
// The destination travels in a `?next=` query parameter (the Treasure Hunt game
// page already uses this convention). Anything coming from the URL is untrusted,
// so every value goes through getSafeRedirectPath() before we navigate to it.

const PLACEHOLDER_ORIGIN = "http://placeholder.invalid";

// Auth pages themselves are never valid destinations (prevents redirect loops).
const AUTH_PATHS = ["/auth/login", "/auth/signup", "/auth/verify-email"];

/**
 * Returns a safe, same-site path (with query/hash preserved), or null if the
 * value is missing, external, or malformed.
 */
export function getSafeRedirectPath(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value || value.length > 2048) return null;

  // Must be an absolute path on this site: "/something". Rejects "https://evil.com",
  // "evil.com", "javascript:..." and protocol-relative "//evil.com".
  if (!value.startsWith("/") || value.startsWith("//")) return null;

  // Reject backslashes (browsers treat "/\evil.com" like "//evil.com"),
  // whitespace and control characters.
  if (/[\\\s\u0000-\u001f\u007f]/.test(value)) return null;

  let url: URL;
  try {
    url = new URL(value, PLACEHOLDER_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== PLACEHOLDER_ORIGIN) return null;

  if (AUTH_PATHS.some((p) => url.pathname === p || url.pathname.startsWith(p + "/"))) {
    return null;
  }

  return url.pathname + url.search + url.hash;
}

/** Reads and validates ?next= from the current browser URL. Client-side only. */
export function readNextFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  return getSafeRedirectPath(new URLSearchParams(window.location.search).get("next"));
}

/** "/auth/login" + (optional) next -> "/auth/login?next=%2Fevents%2Ftreasurehunt" */
export function withNext(path: string, next: string | null | undefined): string {
  const safe = getSafeRedirectPath(next);
  return safe ? `${path}?next=${encodeURIComponent(safe)}` : path;
}
