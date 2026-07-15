"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, ShieldCheck } from "@phosphor-icons/react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function VerifyCertificatePage() {
  const router = useRouter();
  const [certificateNumber, setCertificateNumber] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = certificateNumber.trim().toUpperCase();
    if (normalized) router.push(`/verify-certificate/${encodeURIComponent(normalized)}`);
  }

  return (
    <main className="premium-bg min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <BrandLogo />
        <Card className="mt-10">
          <CardHeader>
            <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <ShieldCheck />
            </div>
            <CardTitle>Verify a GaugeHow certificate</CardTitle>
            <p className="text-sm text-slate-600">
              Enter the certificate number printed beside the QR code. Verification is public
              and does not require an account.
            </p>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submit}>
              <Input
                value={certificateNumber}
                onChange={(event) => setCertificateNumber(event.target.value)}
                placeholder="GH-COURSE-000000000000"
                aria-label="Certificate number"
                required
              />
              <Button type="submit">
                <MagnifyingGlass />
                Verify certificate
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
