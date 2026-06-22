import { API_BASE_URL } from "@/lib/api-base";

export class PaymentApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PaymentApiError";
    this.status = status;
  }
}

export type PaymentGateway = "razorpay" | "stripe" | "mock";
export type PaymentStatus =
  | "pending"
  | "requires_action"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "refunded";

export type PaymentCheckout = {
  id: string;
  course_id: string;
  course_slug: string;
  course_title: string;
  gateway: PaymentGateway;
  status: PaymentStatus;
  amount_minor: number;
  currency_code: string;
  display_amount_minor: number;
  display_currency_code: string;
  country_code: string | null;
  pricing_tier: string;
  gateway_order_id: string | null;
  gateway_checkout_url: string | null;
  razorpay_key_id: string | null;
};

export type PaymentOrder = {
  id: string;
  course_id: string;
  course_title: string | null;
  gateway: PaymentGateway;
  status: PaymentStatus;
  amount_minor: number;
  currency_code: string;
  display_amount_minor: number;
  display_currency_code: string;
  country_code: string | null;
  pricing_tier: string;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  created_at: string;
  completed_at: string | null;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

async function paymentRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    credentials: "include",
    cache: "no-store",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = "Payment request failed";
    try {
      const payload = (await response.json()) as { detail?: string };
      message = payload.detail ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new PaymentApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export const paymentClient = {
  createCourseCheckout(
    token: string,
    payload: {
      courseSlug: string;
      successUrl?: string;
      cancelUrl?: string;
    },
  ) {
    return paymentRequest<PaymentCheckout>("/payments/course-checkout", {
      method: "POST",
      token,
      body: {
        course_slug: payload.courseSlug,
        success_url: payload.successUrl ?? null,
        cancel_url: payload.cancelUrl ?? null,
      },
    });
  },
  verifyRazorpay(
    token: string,
    payload: {
      paymentOrderId: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ) {
    return paymentRequest<{ payment: PaymentOrder; access_granted: boolean }>(
      "/payments/razorpay/verify",
      {
        method: "POST",
        token,
        body: {
          payment_order_id: payload.paymentOrderId,
          razorpay_order_id: payload.razorpayOrderId,
          razorpay_payment_id: payload.razorpayPaymentId,
          razorpay_signature: payload.razorpaySignature,
        },
      },
    );
  },
  completeMock(token: string, paymentOrderId: string) {
    return paymentRequest<{ payment: PaymentOrder; access_granted: boolean }>(
      `/payments/mock/${paymentOrderId}/complete`,
      {
        method: "POST",
        token,
      },
    );
  },
  history(token: string) {
    return paymentRequest<{ items: PaymentOrder[] }>("/payments/history", { token });
  },
};
