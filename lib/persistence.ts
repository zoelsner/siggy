import { coerceSignatureDocument } from "./document";
import type { PersistenceAdapter, SignatureDocument } from "./types";

const STORAGE_KEY = "siggy:draft:v1";

export function createBrowserDraftAdapter(): PersistenceAdapter {
  return {
    load() {
      if (typeof window === "undefined") {
        return null;
      }

      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return coerceSignatureDocument(JSON.parse(raw));
      } catch {
        return null;
      }
    },
    save(document: SignatureDocument) {
      if (typeof window === "undefined") {
        return false;
      }

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
        return true;
      } catch {
        return false;
      }
    },
    clear() {
      if (typeof window === "undefined") {
        return false;
      }

      try {
        window.localStorage.removeItem(STORAGE_KEY);
        return true;
      } catch {
        return false;
      }
    }
  };
}
