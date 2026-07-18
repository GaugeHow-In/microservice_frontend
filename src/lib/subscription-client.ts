import { API_BASE_URL } from "@/lib/api-base";

export class SubscriptionApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SubscriptionApiError";
    this.status = status;
  }
}

export type PlanInterval = "monthly" | "half_yearly" | "annual";
export type SubscriptionGateway = "razorpay" | "stripe" | "paypal" | "mock";
export type SubscriptionStatus =
  | "pending"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";

export type PlanPrice = {
  plan_id: string;
  code: string;
  name: string;
  description: string | null;
  interval: PlanInterval;
  interval_months: number;
  amount_minor: number;
  currency_code: string;
  per_month_minor: number;
  compare_at_minor: number | null;
  savings_percent: number;
  is_display_price_estimated: boolean;
  pricing_tier: string | null;
  is_most_popular: boolean;
  sort_order: number;
};

export type SubscriptionSummaryResponse = {
  id: string;
  plan_code: string;
  plan_name: string;
  interval: PlanInterval;
  gateway: SubscriptionGateway;
  status: SubscriptionStatus;
  is_plus: boolean;
  amount_minor: number;
  currency_code: string;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  started_at: string | null;
  cancelled_at: string | null;
};

export type PlanCatalog = {
  plans: PlanPrice[];
  country_code: string | null;
  currency_code: string;
  available_gateways: SubscriptionGateway[];
  current_subscription: SubscriptionSummaryResponse | null;
};

export type SubscriptionCheckout = {
  subscription_id: string;
  gateway: SubscriptionGateway;
  status: SubscriptionStatus;
  gateway_subscription_id: string | null;
  checkout_url: string | null;
  amount_minor: number;
  currency_code: string;
  client_params: Record<string, unknown>;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

async function subscriptionRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    credentials: "include",
    cache: "no-store",
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    let message = "Subscription request failed";
    try {
      const payload = (await response.json()) as { detail?: string };
      message = payload.detail ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new SubscriptionApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const subscriptionClient = {
  plans(token?: string | null) {
    return subscriptionRequest<PlanCatalog>("/subscriptions/plans", { token });
  },
  current(token: string) {
    return subscriptionRequest<SubscriptionSummaryResponse | null>("/subscriptions/me", { token });
  },
  checkout(
    token: string,
    payload: { planCode: string; gateway?: SubscriptionGateway; successUrl?: string; cancelUrl?: string }
  ) {
    return subscriptionRequest<SubscriptionCheckout>("/subscriptions/checkout", {
      method: "POST",
      token,
      body: {
        plan_code: payload.planCode,
        gateway: payload.gateway ?? null,
        success_url: payload.successUrl ?? null,
        cancel_url: payload.cancelUrl ?? null
      }
    });
  },
  confirmRazorpay(
    token: string,
    payload: {
      subscriptionId: string;
      razorpayPaymentId: string;
      razorpaySubscriptionId: string;
      razorpaySignature: string;
    }
  ) {
    return subscriptionRequest<SubscriptionSummaryResponse>("/subscriptions/razorpay/confirm", {
      method: "POST",
      token,
      body: {
        subscription_id: payload.subscriptionId,
        razorpay_payment_id: payload.razorpayPaymentId,
        razorpay_subscription_id: payload.razorpaySubscriptionId,
        razorpay_signature: payload.razorpaySignature
      }
    });
  },
  cancel(token: string, atPeriodEnd = true) {
    return subscriptionRequest<SubscriptionSummaryResponse>("/subscriptions/cancel", {
      method: "POST",
      token,
      body: { at_period_end: atPeriodEnd }
    });
  }
};

export function formatMinor(amountMinor: number, currencyCode: string): string {
  const zeroDecimal = new Set(["JPY", "KRW", "VND", "CLP"]);
  const divisor = zeroDecimal.has(currencyCode) ? 1 : 100;
  const value = amountMinor / divisor;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: value % 1 === 0 ? 0 : 2
    }).format(value);
  } catch {
    return `${currencyCode} ${value.toFixed(zeroDecimal.has(currencyCode) ? 0 : 2)}`;
  }
}
