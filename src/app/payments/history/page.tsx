"use client";

import { useEffect, useState } from "react";
import { CreditCard } from "@phosphor-icons/react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { paymentClient, type PaymentOrder } from "@/lib/payment-client";

function formatMinor(amountMinor: number, currencyCode: string): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode,
  }).format(amountMinor / 100);
}

export default function PaymentHistoryPage() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [payments, setPayments] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    let cancelled = false;

    async function loadPayments() {
      if (!accessToken) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await paymentClient.history(accessToken);
        if (!cancelled) {
          setPayments(response.items);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load payment history.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPayments();
    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthLoading]);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Payments"
          title="Payment history"
          description="Review course checkout attempts, successful purchases, and gateway references."
        />

        {error && (
          <Card>
            <CardContent className="p-4 text-sm text-rose-600">{error}</CardContent>
          </Card>
        )}

        <div className="divide-y divide-[color:var(--border)]">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="py-4">
                <Skeleton className="h-14 rounded-xl" />
              </div>
            ))
          ) : payments.length ? (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg surface-secondary text-slate-950">
                    <CreditCard className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950">
                      {payment.course_title ?? "Course payment"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {payment.gateway} · {payment.gateway_payment_id ?? payment.gateway_order_id ?? payment.id}
                    </p>
                  </div>
                </div>
                <div className="sm:text-right">
                  <p className="font-bold text-slate-950">
                    {formatMinor(payment.display_amount_minor, payment.display_currency_code)}
                  </p>
                  <Badge variant={payment.status === "succeeded" ? "green" : "default"}>
                    {payment.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="py-4 text-sm text-slate-500">No payment history yet.</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
