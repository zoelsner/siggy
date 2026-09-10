import { afterEach, describe, expect, it, vi } from "vitest";
import { createBrowserDraftAdapter } from "../lib/persistence";
import { createDefaultDocument } from "../lib/default-document";

afterEach(() => vi.unstubAllGlobals());

describe("browser draft persistence", () => {
  it("loads, saves, and clears a draft normally", () => {
    const items = new Map<string, string>();
    vi.stubGlobal("window", { localStorage: {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => items.set(key, value),
      removeItem: (key: string) => items.delete(key),
    } });
    const adapter = createBrowserDraftAdapter();
    const document = { ...createDefaultDocument(), fullName: "Saved Person" };
    expect(adapter.load()).toBeNull();
    expect(adapter.save(document)).toBe(true);
    expect(adapter.load()?.fullName).toBe("Saved Person");
    expect(adapter.clear()).toBe(true);
    expect(adapter.load()).toBeNull();
  });

  it("contains a browser SecurityError even when accessing localStorage itself throws", () => {
    vi.stubGlobal("window", Object.defineProperty({}, "localStorage", { get() { throw new DOMException("Denied", "SecurityError"); } }));
    const adapter = createBrowserDraftAdapter();
    expect(adapter.load()).toBeNull();
    expect(adapter.save(createDefaultDocument())).toBe(false);
    expect(adapter.clear()).toBe(false);
  });

  it("reports quota failure without changing the existing draft and recovers on a later save", () => {
    let stored = JSON.stringify({ ...createDefaultDocument(), fullName: "Previous Name" });
    const setItem = vi.fn().mockImplementationOnce(() => { throw new DOMException("Full", "QuotaExceededError"); }).mockImplementation((_key: string, value: string) => { stored = value; });
    vi.stubGlobal("window", { localStorage: { getItem: () => stored, setItem, removeItem: vi.fn() } });
    const adapter = createBrowserDraftAdapter();
    const document = { ...createDefaultDocument(), fullName: "New Name" };
    expect(adapter.save(document)).toBe(false);
    expect(adapter.load()?.fullName).toBe("Previous Name");
    expect(adapter.save(document)).toBe(true);
    expect(adapter.load()?.fullName).toBe("New Name");
  });

  it("does not throw on invalid saved JSON or a failed removal", () => {
    vi.stubGlobal("window", { localStorage: { getItem: () => "{broken", removeItem: () => { throw new Error("Unavailable"); } } });
    const adapter = createBrowserDraftAdapter();
    expect(adapter.load()).toBeNull();
    expect(adapter.clear()).toBe(false);
  });

  it("does not claim a save succeeded outside the browser", () => {
    vi.stubGlobal("window", undefined);
    const adapter = createBrowserDraftAdapter();
    expect(adapter.load()).toBeNull();
    expect(adapter.save(createDefaultDocument())).toBe(false);
    expect(adapter.clear()).toBe(false);
  });
});
