"use client";

import { CheckCircle, Sparkle, Lightning, Books, Certificate, Exam, Path } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { ensureRazorpayScript } from "@/lib/razorpay";
import { cn } from "@/lib/utils";
import {
  formatMinor,
  subscriptionClient,
  type PlanCatalog,
  type PlanPrice,
  type SubscriptionGateway
} from "@/lib/subscription-client";

const GATEWAY_LABEL: Record<SubscriptionGateway, string> = {
  razorpay: "Razorpay",
  stripe: "Card (Stripe)",
  paypal: "PayPal",
  mock: "Test checkout"
};

const PLUS_FEATURES = [
  { icon: Books, label: "Every course, start to finish", detail: "Unlimited access to all paid courses" },
  { icon: Exam, label: "All practice tests", detail: "Timed mocks, analytics and explanations" },
  { icon: Path, label: "All library documents", detail: "Read every reference PDF in full" },
  { icon: Certificate, label: "Course certificates", detail: "Earn shareable certificates on completion" },
  { icon: Lightning, label: "AI lesson tools", detail: "Notes, flashcards and the AI mentor" }
];

export default function PlusPage() {
  return (
    <AppShell>
      <PlusPricing />
    </AppShell>
  );
}

function PlusPricing() {
  const { accessToken, user, refreshSession } = useAuth();
  const [catalog, setCatalog] = useState<PlanCatalog | null>(null);
  const [gateway, setGateway] = useState<SubscriptionGateway | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  const isPlus = Boolean(user?.subscription?.is_plus) || Boolean(catalog?.current_subscription?.is_plus);

  const loadCatalog = useCallback(async () => {
    try {
      const data = await subscriptionClient.plans(accessToken);
      setCatalog(data);
      setGateway((current) => current ?? data.available_gateways[0] ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load plans.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  async function startCheckout(plan: PlanPrice) {
    if (!accessToken) {
      setError("Please sign in to subscribe.");
      return;
    }
    setError(null);
    setPendingPlan(plan.code);
    try {
      const checkout = await subscriptionClient.checkout(accessToken, {
        planCode: plan.code,
        gateway: gateway ?? undefined,
        successUrl: `${window.location.origin}/plus?checkout=success`,
        cancelUrl: `${window.location.origin}/plus?checkout=cancelled`
      });

      // Hosted flows (Stripe, PayPal, mock) hand us a URL to send the user to.
      if (checkout.checkout_url && checkout.gateway !== "razorpay") {
        window.location.href = checkout.checkout_url;
        return;
      }

      if (checkout.gateway === "razorpay") {
        await launchRazorpay(checkout);
        return;
      }

      // Mock or already-active with no redirect: reflect the new state.
      await refreshSession();
      await loadCatalog();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start checkout.");
    } finally {
      setPendingPlan(null);
    }
  }

  async function launchRazorpay(checkout: Awaited<ReturnType<typeof subscriptionClient.checkout>>) {
    if (!accessToken) return;
    const keyId = checkout.client_params?.razorpay_key_id as string | undefined;
    const razorpaySubscriptionId =
      (checkout.client_params?.subscription_id as string | undefined) ??
      checkout.gateway_subscription_id ??
      undefined;
    if (!keyId || !razorpaySubscriptionId) {
      throw new Error("Razorpay checkout is not configured.");
    }
    await ensureRazorpayScript();
    if (!window.Razorpay) {
      throw new Error("Razorpay checkout is unavailable.");
    }
    const razorpay = new window.Razorpay({
      key: keyId,
      subscription_id: razorpaySubscriptionId,
      name: "GaugeHow-Plus",
      description: "Subscription",
      prefill: { name: user?.display_name, email: user?.email },
      theme: { color: "#d97706" },
      handler: async (response) => {
        try {
          await subscriptionClient.confirmRazorpay(accessToken, {
            subscriptionId: checkout.subscription_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySubscriptionId: response.razorpay_subscription_id,
            razorpaySignature: response.razorpay_signature
          });
          await refreshSession();
          await loadCatalog();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Payment verification failed.");
        }
      }
    });
    razorpay.open();
  }

  const orderedPlans = useMemo(
    () => (catalog ? [...catalog.plans].sort((a, b) => a.sort_order - b.sort_order) : []),
    [catalog]
  );

  return (
    <div className="mx-auto max-w-6xl">
      <header className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
          <Sparkle weight="fill" className="size-3.5" /> GaugeHow-Plus
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          One subscription. Everything unlocked.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500 sm:text-base">
          The first two lessons of every course are always free. Go Plus to unlock every course, test
          and document — pick the plan that fits you. Cancel anytime.
        </p>
      </header>

      {isPlus && catalog?.current_subscription ? (
        <ActivePlusBanner catalog={catalog} onChanged={loadCatalog} />
      ) : null}

      {error ? (
        <p className="mx-auto mt-6 max-w-xl rounded-lg bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      {catalog && catalog.available_gateways.length > 1 && !isPlus ? (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-semibold uppercase text-slate-500">Pay with</span>
          {catalog.available_gateways.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setGateway(option)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-semibold transition",
                gateway === option
                  ? "border-amber-500 bg-amber-50 text-amber-700"
                  : "border-slate-200 text-slate-500 hover:border-slate-300"
              )}
            >
              {GATEWAY_LABEL[option]}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-10 text-center text-sm text-slate-500">Loading plans…</p>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {orderedPlans.map((plan) => (
            <PlanCard
              key={plan.code}
              plan={plan}
              currency={catalog?.currency_code ?? plan.currency_code}
              isCurrent={catalog?.current_subscription?.plan_code === plan.code && isPlus}
              disabled={isPlus || pendingPlan !== null}
              pending={pendingPlan === plan.code}
              onSubscribe={() => startCheckout(plan)}
            />
          ))}
        </div>
      )}

      <section className="mt-14">
        <h2 className="text-center text-lg font-bold text-slate-950">Everything in GaugeHow-Plus</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLUS_FEATURES.map((feature) => (
            <div key={feature.label} className="surface-secondary flex items-start gap-3 rounded-xl p-4">
              <feature.icon weight="duotone" className="mt-0.5 size-6 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-bold text-slate-950">{feature.label}</p>
                <p className="text-xs text-slate-500">{feature.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PlanCard({
  plan,
  currency,
  isCurrent,
  disabled,
  pending,
  onSubscribe
}: {
  plan: PlanPrice;
  currency: string;
  isCurrent: boolean;
  disabled: boolean;
  pending: boolean;
  onSubscribe: () => void;
}) {
  const highlighted = plan.is_most_popular;
  const perMonth = formatMinor(plan.per_month_minor, plan.currency_code || currency);
  const total = formatMinor(plan.amount_minor, plan.currency_code || currency);
  const compareAt =
    plan.compare_at_minor && plan.compare_at_minor > plan.amount_minor
      ? formatMinor(plan.compare_at_minor, plan.currency_code || currency)
      : null;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-[color:var(--surface-1,#fff)] p-6 transition",
        highlighted
          ? "border-amber-400 shadow-[0_10px_40px_-12px_rgba(245,158,11,0.45)] ring-1 ring-amber-300"
          : "border-slate-200 shadow-sm"
      )}
    >
      {highlighted ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow">
          Best value
        </span>
      ) : null}

      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-950">{plan.name}</h3>
        {plan.savings_percent > 0 ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
            Save {plan.savings_percent}%
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-end gap-1">
        <span className="text-3xl font-extrabold tracking-tight text-slate-950">{perMonth}</span>
        <span className="pb-1 text-sm font-semibold text-slate-500">/mo</span>
      </div>

      <p className="mt-1 text-xs text-slate-500">
        {plan.interval === "monthly" ? (
          <>Billed monthly</>
        ) : (
          <>
            {compareAt ? <span className="mr-1 text-slate-400 line-through">{compareAt}</span> : null}
            <span className="font-semibold text-slate-600">{total}</span> billed every{" "}
            {plan.interval_months} months
          </>
        )}
      </p>

      <Button
        onClick={onSubscribe}
        disabled={disabled}
        variant={highlighted ? "default" : "outline"}
        className="mt-6 w-full"
      >
        {isCurrent ? "Current plan" : pending ? "Starting…" : "Choose plan"}
      </Button>

      <ul className="mt-6 space-y-2">
        {["Unlimited courses & tests", "Full library access", "Certificates & AI tools"].map((line) => (
          <li key={line} className="flex items-center gap-2 text-sm text-slate-600">
            <CheckCircle weight="fill" className="size-4 text-amber-500" />
            {line}
          </li>
        ))}
      </ul>
      {plan.is_display_price_estimated ? (
        <p className="mt-4 text-[11px] text-slate-400">Price shown is an estimate in your local currency.</p>
      ) : null}
    </div>
  );
}

function ActivePlusBanner({ catalog, onChanged }: { catalog: PlanCatalog; onChanged: () => Promise<void> }) {
  const { accessToken, refreshSession } = useAuth();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const subscription = catalog.current_subscription!;
  const renews = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : null;

  async function cancel() {
    if (!accessToken) return;
    setBusy(true);
    setNote(null);
    try {
      await subscriptionClient.cancel(accessToken, true);
      await refreshSession();
      await onChanged();
      setNote("Your subscription will not renew. You keep Plus until the current term ends.");
    } catch (cause) {
      setNote(cause instanceof Error ? cause.message : "Unable to cancel.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-amber-300 bg-amber-50/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Sparkle weight="fill" className="size-6 text-amber-600" />
          <div>
            <p className="text-sm font-bold text-slate-950">
              You’re on {subscription.plan_name}
            </p>
            <p className="text-xs text-slate-600">
              {subscription.cancel_at_period_end
                ? renews
                  ? `Ends on ${renews}`
                  : "Ending soon"
                : renews
                  ? `Renews on ${renews}`
                  : "Active"}
            </p>
          </div>
        </div>
        {!subscription.cancel_at_period_end ? (
          <Button variant="outline" onClick={cancel} disabled={busy}>
            {busy ? "Cancelling…" : "Cancel subscription"}
          </Button>
        ) : null}
      </div>
      {note ? <p className="mt-3 text-xs font-semibold text-amber-800">{note}</p> : null}
    </div>
  );
}
