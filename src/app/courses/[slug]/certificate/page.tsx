"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Award, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { CertificateViewer } from "@/components/sections/certificate-viewer";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LearningApiError,
  learningClient,
  type Certificate,
} from "@/lib/learning-client";

export default function CourseCertificatePage() {
  const { slug } = useParams<{ slug: string }>();
  const { accessToken, isLoading: authLoading } = useAuth();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [notIssued, setNotIssued] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!accessToken) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void learningClient
      .getMyCertificate(slug, accessToken)
      .then((result) => {
        if (!cancelled) setCertificate(result);
      })
      .catch((cause) => {
        if (cancelled) return;
        if (cause instanceof LearningApiError && cause.status === 404) setNotIssued(true);
        else setError(cause instanceof Error ? cause.message : "Unable to load certificate.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, authLoading, slug]);

  async function issueCertificate() {
    if (!accessToken) return;
    setIssuing(true);
    setError(null);
    try {
      const result = await learningClient.issueCertificate(slug, accessToken);
      setCertificate(result);
      setNotIssued(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to issue certificate.");
    } finally {
      setIssuing(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/courses/progress">
            <ArrowLeft />
            Course progress
          </Link>
        </Button>
        <PageHeader
          eyebrow="Course achievement"
          title="Your completion certificate"
          description="Generate once, then return anytime to verify or download the same certificate as PNG or PDF."
        />

        {loading ? (
          <Skeleton className="aspect-[1.414/1] w-full rounded-xl" />
        ) : certificate ? (
          <CertificateViewer certificate={certificate} />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-start gap-4 p-6">
              <div className="flex size-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <Award />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-950">Issue your certificate</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Eligibility is checked against your recorded 100% course completion.
                </p>
              </div>
              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              {notIssued ? (
                <Button type="button" disabled={issuing} onClick={issueCertificate}>
                  <Award />
                  {issuing ? "Generating…" : "Generate certificate"}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
