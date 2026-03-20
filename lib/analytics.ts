import type { AnalyticsEvent } from "./types";

const SESSION_KEY = "siggy:session-id";

export function getSessionId(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();
  window.sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

export function trackEvent(event: string, context?: AnalyticsEvent["context"]) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: AnalyticsEvent = {
    sessionId: getSessionId(),
    event,
    ts: new Date().toISOString(),
    context
  };

  const body = JSON.stringify(payload);

  if ("sendBeacon" in navigator) {
    navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    return;
  }

  void fetch("/api/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body,
    keepalive: true
  }).catch(() => undefined);
}
