const KEY = "siggy_attribution";

const TRACKED_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
  "ref"
] as const;

const MAX_VALUE_LENGTH = 200;

export function captureAttribution(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (localStorage.getItem(KEY)) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const captured: Record<string, string> = {};

    for (const key of TRACKED_PARAMS) {
      const value = params.get(key);
      if (value) {
        captured[key] = value.slice(0, MAX_VALUE_LENGTH);
      }
    }

    if (Object.keys(captured).length === 0) {
      return;
    }

    captured.landing = window.location.pathname;
    captured.ts = new Date().toISOString();

    localStorage.setItem(KEY, JSON.stringify(captured));
  } catch {
    // localStorage can be unavailable (private browsing, disabled storage) — never throw.
  }
}

export function getAttribution(): Record<string, string> | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem(KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored) as Record<string, string>;
  } catch {
    return null;
  }
}
