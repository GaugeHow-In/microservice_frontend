"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkle } from "@phosphor-icons/react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatMinor,
  subscriptionClient,
  type SubscriptionSummaryResponse
} from "@/lib/subscription-client";

export default function BillingPage() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    let cancelled = false;

    async function load() {
      if (!accessToken) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const current = await subscriptionClient.current(accessToken);
        if (!cancelled) setSubscription(current);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load your subscription.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthLoading]);

  const renews = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : null;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Billing"
          title="Your subscription"
          description="Manage your GaugeHow-Plus membership and see when it renews."
        />

        {error && (
          <Card>
            <CardContent className="p-4 text-sm text-rose-600">{error}</CardContent>
          </Card>
        )}

        {loading ? (
          <Skeleton className="h-28 rounded-2xl" />
        ) : subscription ? (
          <Card>
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Sparkle weight="fill" className="size-7 text-amber-500" />
                <div>
                  <p className="flex items-center gap-2 font-bold text-slate-950">
                    {subscription.plan_name}
                    <Badge variant={subscription.is_plus ? "green" : "default"}>
                      {subscription.status.replace("_", " ")}
                    </Badge>
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatMinor(subscription.amount_minor, subscription.currency_code)} ·{" "}
                    {subscription.cancel_at_period_end
                      ? renews
                        ? `Ends ${renews}`
                        : "Ending soon"
                      : renews
                        ? `Renews ${renews}`
                        : "Active"}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline">
                <Link href="/plus">Manage</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-start gap-4 p-6">
              <p className="text-sm text-slate-500">
                You don’t have an active subscription. Go Plus to unlock every course, test and
                document.
              </p>
              <Button asChild className="bg-gradient-to-r from-amber-500 to-amber-600">
                <Link href="/plus">
                  <Sparkle weight="fill" />
                  See GaugeHow-Plus plans
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
