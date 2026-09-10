import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Exercise the hook's asynchronous effect without a DOM renderer dependency.
const hooks = vi.hoisted(() => ({ states: [] as Array<{ value: unknown }>, effect: null as null | (() => unknown) }));
vi.mock("react", () => ({
  useState: (initial: unknown) => {
    const state = { value: initial }; hooks.states.push(state);
    return [initial, (next: unknown) => { state.value = next; }];
  },
  useEffect: (effect: () => unknown) => { hooks.effect = effect; },
  useCallback: (callback: unknown) => callback,
}));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
import { useAccess } from "../lib/billing/use-access";

let replaceState: ReturnType<typeof vi.fn>;
beforeEach(() => {
  hooks.states = []; hooks.effect = null;
  replaceState = vi.fn();
  vi.stubGlobal("window", { location: { search: "", pathname: "/editor" }, history: { replaceState } });
  vi.stubGlobal("localStorage", { getItem: vi.fn().mockReturnValue(null), setItem: vi.fn(), removeItem: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());
async function resolveAccess() {
  useAccess(); hooks.effect!();
  await vi.waitFor(() => expect(hooks.states[1].value).toBe(true));
  const [unlocked, resolved, token, error, accessSaveFailed] = hooks.states.map((state) => state.value);
  return { unlocked, resolved, token, error, accessSaveFailed };
}

describe("purchase access with unavailable browser storage", () => {
  it.each(["session_id", "access_token"])("keeps verified %s access in memory and cleans its URL when saving fails", async (parameter) => {
    window.location.search = `?${parameter}=verified-value&utm_source=test`;
    vi.stubGlobal("localStorage", { setItem: () => { throw new DOMException("Denied", "SecurityError"); } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(parameter === "session_id" ? { token: "verified-token" } : { valid: true })));
    const result = await resolveAccess();
    expect(result).toMatchObject({ unlocked: true, resolved: true, accessSaveFailed: true, error: null });
    expect(result.token).toBe(parameter === "session_id" ? "verified-token" : "verified-value");
    expect(replaceState).toHaveBeenCalledWith({}, "", "/editor?utm_source=test");
  });

  it("resolves free access when reading cached storage throws", async () => {
    vi.stubGlobal("localStorage", { getItem: () => { throw new DOMException("Denied", "SecurityError"); } });
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await resolveAccess()).toMatchObject({ unlocked: false, resolved: true, token: null });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("resolves free access when an invalid token cannot be removed", async () => {
    vi.stubGlobal("localStorage", { getItem: () => "invalid-token", removeItem: () => { throw new Error("Denied"); } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ valid: false })));
    expect(await resolveAccess()).toMatchObject({ unlocked: false, resolved: true, token: null });
  });

  it("preserves ordinary persisted access after server verification", async () => {
    window.location.search = "?access_token=verified-value";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ valid: true })));
    expect(await resolveAccess()).toMatchObject({ unlocked: true, token: "verified-value", accessSaveFailed: false });
    expect(localStorage.setItem).toHaveBeenCalledWith("siggy_access", "verified-value");
  });
});
