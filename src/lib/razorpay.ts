export type RazorpaySubscriptionResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

export type RazorpaySubscriptionOptions = {
  key: string;
  subscription_id: string;
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (response: RazorpaySubscriptionResponse) => void;
  modal?: { ondismiss?: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpaySubscriptionOptions) => { open: () => void };
  }
}

let razorpayScriptPromise: Promise<void> | null = null;

/** Load the Razorpay Checkout script once and resolve when it is ready. */
export function ensureRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window.Razorpay) {
    return Promise.resolve();
  }
  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[data-razorpay-checkout="true"]'
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Razorpay.")), {
        once: true
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpayCheckout = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Unable to load Razorpay.")), {
      once: true
    });
    document.head.appendChild(script);
  });

  return razorpayScriptPromise;
}
