import { coerceSignatureDocument } from "./document";
import type { PersistenceAdapter, SignatureDocument } from "./types";

const STORAGE_KEY = "siggy:draft:v1";

export function createBrowserDraftAdapter(): PersistenceAdapter {
  return {
    load() {
      if (typeof window === "undefined") {
        return null;
      }

      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }

      try {
        return coerceSignatureDocument(JSON.parse(raw));
      } catch {
        return null;
      }
    },
    save(document: SignatureDocument) {
      if (typeof window === "undefined") {
        return;
      }

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
    },
    clear() {
      if (typeof window === "undefined") {
        return;
      }

      window.localStorage.removeItem(STORAGE_KEY);
    }
  };
}
