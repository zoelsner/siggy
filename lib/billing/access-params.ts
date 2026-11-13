// Purchase credentials (?session_id from Stripe, ?access_token from the
// receipt/restore email) must never be in the page URL when a third-party
// script (ad pixels, analytics) reads location.href or document.referrer.
// app/layout.tsx runs scrubAccessParams as the first inline <head> script, so
// the URL is clean before any other script runs; use-access then redeems the
// stashed values.

export const PENDING_ACCESS_KEY = "siggy_pending_access";

export type PendingAccess = { session_id?: string; access_token?: string };

type ScrubWindow = {
  location: { href: string };
  history: { state: unknown; replaceState(data: unknown, unused: string, url: string): void };
  sessionStorage?: { setItem(key: string, value: string): void };
  __siggyPendingAccess?: PendingAccess;
};

// Serialized with toString() into the inline <head> script: it must stay
// self-contained (no imports, no module constants) and use plain syntax.
// Keep the literals in sync with PENDING_ACCESS_KEY; tests enforce it.
export function scrubAccessParams(win: ScrubWindow): void {
  try {
    var url = new URL(win.location.href);
    var found: PendingAccess = {};
    var names: Array<keyof PendingAccess> = ["session_id", "access_token"];
    var hit = false;
    for (var i = 0; i < names.length; i++) {
      var value = url.searchParams.get(names[i]);
      if (value !== null) {
        found[names[i]] = value;
        url.searchParams.delete(names[i]);
        hit = true;
      }
    }
    if (!hit) return;
    // In-memory copy survives blocked storage; sessionStorage survives a reload.
    win.__siggyPendingAccess = found;
    try {
      win.sessionStorage!.setItem("siggy_pending_access", JSON.stringify(found));
    } catch (e) {
      // Storage blocked: the in-memory copy still lets this page redeem.
    }
    win.history.replaceState(win.history.state, "", url.pathname + url.search + url.hash);
  } catch (e) {
    // Never break the page. MarketingScripts refuses to load while either
    // parameter is still in the URL, so a failure here fails closed.
  }
}

export const SCRUB_ACCESS_PARAMS_SCRIPT = `(${scrubAccessParams.toString()})(window);`;

export function hasAccessParams(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.has("session_id") || params.has("access_token");
}

/** Stashed credentials from the head script, falling back to the URL. */
export function readPendingAccess(search: string): PendingAccess {
  const win = window as unknown as ScrubWindow;
  if (win.__siggyPendingAccess) return win.__siggyPendingAccess;
  try {
    const stored = sessionStorage.getItem(PENDING_ACCESS_KEY);
    if (stored) return JSON.parse(stored) as PendingAccess;
  } catch {
    // Unavailable or corrupt storage: fall back to the URL.
  }
  const params = new URLSearchParams(search);
  return {
    session_id: params.get("session_id") ?? undefined,
    access_token: params.get("access_token") ?? undefined,
  };
}

export function clearPendingAccess(): void {
  delete (window as unknown as ScrubWindow).__siggyPendingAccess;
  try {
    sessionStorage.removeItem(PENDING_ACCESS_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
