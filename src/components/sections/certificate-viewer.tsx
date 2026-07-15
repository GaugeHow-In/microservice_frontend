"use client";

import { DownloadSimple, FileImage, ShieldCheck, ShieldWarning } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  downloadCertificatePdf,
  downloadCertificatePng,
  renderCertificate,
} from "@/lib/certificate-renderer";
import type { Certificate } from "@/lib/learning-client";

export function CertificateViewer({ certificate }: { certificate: Certificate }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    setRendering(true);
    setRenderError(null);
    void renderCertificate(canvas, certificate)
      .catch((cause) => {
        if (!cancelled) {
          setRenderError(cause instanceof Error ? cause.message : "Unable to render certificate.");
        }
      })
      .finally(() => {
        if (!cancelled) setRendering(false);
      });
    return () => {
      cancelled = true;
    };
  }, [certificate]);

  const canDownload = certificate.valid && !rendering && !renderError;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge
            variant={certificate.valid ? "green" : "default"}
            className={certificate.valid ? undefined : "border-rose-200 bg-rose-50 text-rose-700"}
          >
            {certificate.valid ? <ShieldCheck /> : <ShieldWarning />}
            {certificate.valid ? "Valid certificate" : "Certificate not valid"}
          </Badge>
          <span className="font-mono text-sm text-slate-600">
            {certificate.certificate_number}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!canDownload}
            onClick={() => {
              if (canvasRef.current) downloadCertificatePng(canvasRef.current, certificate);
            }}
          >
            <FileImage />
            Download PNG
          </Button>
          <Button
            type="button"
            disabled={!canDownload}
            onClick={() => {
              if (canvasRef.current) downloadCertificatePdf(canvasRef.current, certificate);
            }}
          >
            <DownloadSimple />
            Download PDF
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-3 sm:p-5">
          {renderError ? <p className="mb-3 text-sm text-rose-600">{renderError}</p> : null}
          <div className="overflow-hidden rounded-lg bg-slate-100 shadow-inner">
            <canvas
              ref={canvasRef}
              className="block h-auto w-full"
              aria-label={`Certificate for ${certificate.recipient_name}`}
            />
          </div>
          {rendering ? <p className="mt-3 text-sm text-slate-500">Rendering certificate…</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
