"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { CertificateViewer } from "@/components/sections/certificate-viewer";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  learningClient,
  type Certificate,
  type LearningApiError,
} from "@/lib/learning-client";

export default function CertificateVerificationResultPage() {
  const params = useParams<{ certificateNumber: string }>();
  const certificateNumber = decodeURIComponent(params.certificateNumber);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void learningClient
      .verifyCertificate(certificateNumber)
      .then((result) => {
        if (!cancelled) setCertificate(result);
      })
      .catch((cause: LearningApiError) => {
        if (!cancelled) {
          setError(cause.status === 404 ? "No certificate was found with this number." : cause.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [certificateNumber]);

  return (
    <main className="premium-bg min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <BrandLogo />
          <Button asChild variant="ghost">
            <Link href="/verify-certificate">
              <ArrowLeft />
              Verify another
            </Link>
          </Button>
        </div>
        <div className="mt-8">
          {error ? (
            <div className="rounded-xl bg-rose-50 p-5 text-rose-700">
              {error}
            </div>
          ) : certificate ? (
            <CertificateViewer certificate={certificate} />
          ) : (
            <Skeleton className="aspect-[1.414/1] w-full rounded-xl" />
          )}
        </div>
      </div>
    </main>
  );
}
