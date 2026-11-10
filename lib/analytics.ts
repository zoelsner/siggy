import { track } from "@vercel/analytics";

import type { AnalyticsEvent } from "./types";

const SESSION_KEY = "siggy:session-id";
let memorySessionId: string | null = null;

export function getSessionId(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;

    const id = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    // Analytics must not interrupt editing or a verified purchase when browser
    // storage is blocked. This identifier lasts only for the current page.
    memorySessionId ??= crypto.randomUUID();
    return memorySessionId;
  }
}

function forwardToPixels(event: string) {
  const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
  if (typeof fbq === "function") {
    if (event === "signature_copied") {
      fbq("track", "Lead");
    } else if (event === "checkout_started") {
      fbq("track", "InitiateCheckout");
    } else if (event === "purchase_completed") {
      fbq("track", "Purchase", { value: 19, currency: "USD" });
    }
  }

  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  if (typeof gtag === "function" && googleAdsId) {
    if (event === "signature_copied" && process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_COPY) {
      gtag("event", "conversion", {
        send_to: `${googleAdsId}/${process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_COPY}`
      });
    } else if (event === "purchase_completed" && process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_PURCHASE) {
      gtag("event", "conversion", {
        send_to: `${googleAdsId}/${process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_PURCHASE}`,
        value: 19,
        currency: "USD"
      });
    }
  }
}

export function trackEvent(event: string, context?: AnalyticsEvent["context"]) {
  if (typeof window === "undefined") {
    return;
  }

  // Forward to Vercel Analytics (primary — goes to Vercel dashboard)
  if (context) {
    track(event, context);
  } else {
    track(event);
  }

  forwardToPixels(event);

  // Also forward to our existing /api/events pipeline (writes to Blob)
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
