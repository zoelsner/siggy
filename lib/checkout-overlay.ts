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

let setupDone = false;
let pendingOnSuccess: ((orderId: string) => void) | null = null;

export function openCheckout(onSuccess: (orderId: string) => void): void {
  if (!window.LemonSqueezy) {
    // Fallback: open checkout in new tab if JS not loaded
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
            pendingOnSuccess(String(orderId));
          }
        }
      },
    });
  }

  window.LemonSqueezy.Url.Open(CHECKOUT_URL);
}
