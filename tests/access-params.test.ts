import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PENDING_ACCESS_KEY,
  SCRUB_ACCESS_PARAMS_SCRIPT,
  clearPendingAccess,
  hasAccessParams,
  readPendingAccess,
  scrubAccessParams,
} from "../lib/billing/access-params";

function fakeWindow(href: string, storage: "ok" | "blocked" = "ok") {
  const store = new Map<string, string>();
  const win = {
    location: { href },
    history: { state: { kept: true }, replaceState: vi.fn((_: unknown, __: string, url: string) => { win.location.href = new URL(url, href).href; }) },
    sessionStorage: {
      setItem: vi.fn((key: string, value: string) => {
        if (storage === "blocked") throw new DOMException("Denied", "SecurityError");
        store.set(key, value);
      }),
    },
    __siggyPendingAccess: undefined as unknown,
  };
  return { win, store };
}

// Runs the exact string that app/layout.tsx inlines, not just the source function.
function runInlineScript(win: unknown) {
  new Function("window", SCRUB_ACCESS_PARAMS_SCRIPT)(win);
}

describe.each([
  ["source function", (win: unknown) => scrubAccessParams(win as Parameters<typeof scrubAccessParams>[0])],
  ["inline script string", runInlineScript],
])("URL scrub (%s)", (_label, run) => {
  it.each(["session_id", "access_token"])("moves %s out of the URL and keeps other parameters", (name) => {
    const { win, store } = fakeWindow(`https://trysiggy.com/editor?utm_source=meta&${name}=secret-value#top`);
    run(win);
    expect(win.location.href).toBe("https://trysiggy.com/editor?utm_source=meta#top");
    expect(win.location.href).not.toContain("secret-value");
    expect(win.history.replaceState).toHaveBeenCalledWith({ kept: true }, "", "/editor?utm_source=meta#top");
    expect(win.__siggyPendingAccess).toEqual({ [name]: "secret-value" });
    expect(JSON.parse(store.get(PENDING_ACCESS_KEY)!)).toEqual({ [name]: "secret-value" });
  });

  it("moves both parameters and drops an emptied query string", () => {
    const { win } = fakeWindow("https://trysiggy.com/editor?session_id=cs_test_1&access_token=tok");
    run(win);
    expect(win.location.href).toBe("https://trysiggy.com/editor");
    expect(win.__siggyPendingAccess).toEqual({ session_id: "cs_test_1", access_token: "tok" });
  });

  it("still cleans the URL and keeps an in-memory copy when storage is blocked", () => {
    const { win } = fakeWindow("https://trysiggy.com/editor?session_id=cs_test_1", "blocked");
    run(win);
    expect(win.location.href).toBe("https://trysiggy.com/editor");
    expect(win.__siggyPendingAccess).toEqual({ session_id: "cs_test_1" });
  });

  it("leaves URLs without purchase credentials untouched", () => {
    const { win } = fakeWindow("https://trysiggy.com/editor?utm_source=meta");
    run(win);
    expect(win.history.replaceState).not.toHaveBeenCalled();
    expect(win.sessionStorage.setItem).not.toHaveBeenCalled();
    expect(win.__siggyPendingAccess).toBeUndefined();
  });

  it("never throws into the page", () => {
    expect(() => run({ location: { href: "not a url" } })).not.toThrow();
  });
});

describe("hasAccessParams", () => {
  it("detects either credential", () => {
    expect(hasAccessParams("?session_id=cs_1")).toBe(true);
    expect(hasAccessParams("?a=1&access_token=x")).toBe(true);
    expect(hasAccessParams("?utm_source=meta")).toBe(false);
    expect(hasAccessParams("")).toBe(false);
  });
});

describe("pending access hand-off", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubBrowser(stored: string | null, pending?: unknown) {
    const sessionStorage = { getItem: vi.fn().mockReturnValue(stored), removeItem: vi.fn() };
    vi.stubGlobal("window", { __siggyPendingAccess: pending });
    vi.stubGlobal("sessionStorage", sessionStorage);
    return sessionStorage;
  }

  it("prefers the in-memory copy, then sessionStorage (reload), then the URL", () => {
    stubBrowser(JSON.stringify({ session_id: "stored" }), { session_id: "memory" });
    expect(readPendingAccess("?session_id=url")).toEqual({ session_id: "memory" });
    stubBrowser(JSON.stringify({ session_id: "stored" }));
    expect(readPendingAccess("?session_id=url")).toEqual({ session_id: "stored" });
    stubBrowser(null);
    expect(readPendingAccess("?session_id=url&access_token=t")).toEqual({ session_id: "url", access_token: "t" });
  });

  it("clears both copies once access is applied", () => {
    const storage = stubBrowser(null, { access_token: "t" });
    clearPendingAccess();
    expect((window as unknown as { __siggyPendingAccess?: unknown }).__siggyPendingAccess).toBeUndefined();
    expect(storage.removeItem).toHaveBeenCalledWith(PENDING_ACCESS_KEY);
  });
});
