import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { Certificate, CertificateTextPosition } from "@/lib/learning-client";

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The certificate template could not be loaded."));
    image.src = source;
  });
}

function drawDefaultTemplate(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#fff7ed");
  gradient.addColorStop(0.52, "#ffffff");
  gradient.addColorStop(1, "#f8fafc");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "#ea580c";
  context.lineWidth = 12;
  context.strokeRect(38, 38, width - 76, height - 76);
  context.strokeStyle = "#fed7aa";
  context.lineWidth = 3;
  context.strokeRect(58, 58, width - 116, height - 116);

  context.textAlign = "center";
  context.fillStyle = "#c2410c";
  context.font = "700 32px sans-serif";
  context.fillText("GAUGEHOW", width / 2, 150);
  context.fillStyle = "#0f172a";
  context.font = "700 76px serif";
  context.fillText("Certificate of Completion", width / 2, 280);
  context.fillStyle = "#64748b";
  context.font = "28px sans-serif";
  context.fillText("This certificate is proudly presented to", width / 2, 395);
  context.fillText("for successfully completing", width / 2, 575);
  context.font = "20px sans-serif";
  context.fillText("Date of issue", 390, 880);
  context.fillText("Certificate number", 1050, 880);
}

function drawText(
  context: CanvasRenderingContext2D,
  value: string,
  position: CertificateTextPosition,
) {
  context.save();
  context.fillStyle = position.color;
  context.textAlign = position.align;
  context.textBaseline = "alphabetic";
  context.font = `${position.font_weight} ${position.font_size}px ${position.font_family}`;
  context.fillText(value, position.x, position.y);
  context.restore();
}

export async function renderCertificate(
  canvas: HTMLCanvasElement,
  certificate: Certificate,
): Promise<void> {
  const { width, height } = certificate.render_config;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas rendering is not supported by this browser.");

  if (certificate.template_url) {
    const template = await loadImage(certificate.template_url);
    context.drawImage(template, 0, 0, width, height);
  } else {
    drawDefaultTemplate(context, width, height);
  }

  drawText(context, certificate.recipient_name, certificate.render_config.name);
  drawText(context, certificate.course_title, certificate.render_config.course);
  drawText(
    context,
    new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(certificate.issued_at)),
    certificate.render_config.issue_date,
  );
  drawText(
    context,
    certificate.certificate_number,
    certificate.render_config.certificate_number,
  );

  const qrDataUrl = await QRCode.toDataURL(certificate.verification_url, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: certificate.render_config.qr.size,
  });
  const qrImage = await loadImage(qrDataUrl);
  const { x, y, size } = certificate.render_config.qr;
  context.drawImage(qrImage, x, y, size, size);

  if (!certificate.valid) {
    context.save();
    context.translate(width / 2, height / 2);
    context.rotate(-Math.PI / 8);
    context.textAlign = "center";
    context.fillStyle = "rgba(190, 18, 60, 0.28)";
    context.font = "700 150px sans-serif";
    context.fillText("REVOKED", 0, 0);
    context.restore();
  }
}

function safeFilename(certificateNumber: string, extension: string): string {
  return `${certificateNumber.replace(/[^A-Z0-9-]/gi, "-")}.${extension}`;
}

export function downloadCertificatePng(canvas: HTMLCanvasElement, certificate: Certificate) {
  const link = document.createElement("a");
  link.download = safeFilename(certificate.certificate_number, "png");
  link.href = canvas.toDataURL("image/png", 1);
  link.click();
}

export function downloadCertificatePdf(canvas: HTMLCanvasElement, certificate: Certificate) {
  const { width, height } = certificate.render_config;
  const pdf = new jsPDF({
    orientation: width >= height ? "landscape" : "portrait",
    unit: "px",
    format: [width, height],
    hotfixes: ["px_scaling"],
  });
  pdf.addImage(canvas.toDataURL("image/png", 1), "PNG", 0, 0, width, height);
  pdf.save(safeFilename(certificate.certificate_number, "pdf"));
}
