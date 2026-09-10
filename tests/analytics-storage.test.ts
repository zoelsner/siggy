import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@vercel/analytics", () => ({ track: vi.fn() }));
import { getSessionId, trackEvent } from "../lib/analytics";
afterEach(() => vi.unstubAllGlobals());

describe("analytics with restricted session storage", () => {
  it("keeps a stable in-memory session and does not interrupt an editor event", () => {
    vi.stubGlobal("window", Object.defineProperty({}, "sessionStorage", { get() { throw new DOMException("Denied", "SecurityError"); } }));
    const sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { sendBeacon });
    const id = getSessionId();
    expect(id).toBeTruthy();
    expect(getSessionId()).toBe(id);
    expect(() => trackEvent("editor_opened")).not.toThrow();
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });

  it("handles quota failures when creating a session", () => {
    vi.stubGlobal("window", { sessionStorage: { getItem: () => null, setItem: () => { throw new DOMException("Full", "QuotaExceededError"); } } });
    expect(getSessionId()).toBe(getSessionId());
  });

  it("preserves an existing browser session normally", () => {
    const setItem = vi.fn();
    vi.stubGlobal("window", { sessionStorage: { getItem: () => "persisted-session", setItem } });
    expect(getSessionId()).toBe("persisted-session");
    expect(setItem).not.toHaveBeenCalled();
  });
});
