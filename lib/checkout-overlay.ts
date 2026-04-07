import { CHECKOUT_URL } from "./checkout";

declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: {
      Url: { Open: (url: string) => void };
      Setup: (config: {
        eventHandler: (event: { event: string; data?: Record<string, unknown> }) => void;
      }) => void;
    };
  }
}

async function activateOrder(orderId: string): Promise<string | null> {
  try {
    const res = await fetch("/api/activate-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { valid?: boolean; licenseKey?: string };
    return data.valid ? (data.licenseKey ?? null) : null;
  } catch {
    return null;
  }
}

let setupDone = false;
let pendingOnSuccess: ((licenseKey: string) => Promise<boolean>) | null = null;

export function openCheckout(onSuccess: (licenseKey: string) => Promise<boolean>): void {
  if (!window.LemonSqueezy) {
    window.open(CHECKOUT_URL, "_blank");
    return;
  }

  pendingOnSuccess = onSuccess;

  if (!setupDone) {
    setupDone = true;
    window.LemonSqueezy.Setup({
      eventHandler(event) {
        if (event.event === "Checkout.Success") {
          const order = event.data?.order as
            | { data?: { id?: string } }
            | undefined;
          const orderId = order?.data?.id;
          if (orderId && pendingOnSuccess) {
            const callback = pendingOnSuccess;
            void activateOrder(String(orderId)).then((licenseKey) => {
              if (licenseKey) {
                void callback(licenseKey);
              }
            });
          }
        }
      },
    });
  }

  window.LemonSqueezy.Url.Open(CHECKOUT_URL);
}
