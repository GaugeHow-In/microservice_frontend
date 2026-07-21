import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import { LegalPage, LegalSection } from "@/components/shared/legal";

export const metadata: Metadata = {
  title: "Terms & Conditions — GaugeHow",
  description:
    "The terms and conditions governing your use of the GaugeHow website and services, including our refund policy.",
};

export default function TermsPage() {
  return (
    <PublicShell>
      <LegalPage
        title="Terms & Conditions"
        intro={
          <>
            Please read these Terms and Conditions (“Terms”) carefully before using the
            gaugehow.com website (the “Service”) operated by GaugeHow (“us”, “we”, or “our”).
          </>
        }
      >
        <LegalSection>
          <p>
            Your access to and use of the Service is conditioned on your acceptance of and
            compliance with these Terms. These Terms apply to all visitors, users and others who
            access or use the Service.
          </p>
          <p>
            By accessing or using the Service you agree to be bound by these Terms. If you disagree
            with any part of the terms then you may not access the Service.
          </p>
        </LegalSection>

        <LegalSection heading="Shipping / Membership Policy">
          <p>Currently we are not doing any service related to Shipping and/or Membership.</p>
        </LegalSection>

        <LegalSection heading="Purchases">
          <p>
            If you wish to purchase any product or service made available through the Service
            (“Purchase”), you may be asked to supply certain information relevant to your Purchase
            including, without limitation.
          </p>
        </LegalSection>

        <LegalSection heading="Refund Policy">
          <p>
            Thanks for purchasing our products (online courses) at gaugehow.com operated by
            Messgerat Labs.
          </p>
          <p className="font-semibold text-slate-800">
            2-Day Refund Policy — No Questions Asked
          </p>
          <p>
            You can request a refund within 2 days of purchasing the course. Please note: 90% of the
            amount will be refunded. The remaining 10% is deducted by payment service providers and
            is non-refundable.
          </p>
          <p className="font-semibold text-slate-800">Refund eligibility:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>You have not completed the full course</li>
            <li>You have not downloaded the certificate</li>
            <li>You have not downloaded any e-books</li>
          </ul>
          <p>
            Once your request is approved, the refund will be issued within 5–7 working days and
            credited to your bank account. After the 2-day window, refunds are no longer available.
          </p>
          <p>
            For any questions or refund requests,{" "}
            <Link href="/contact" className="font-semibold text-orange-600 hover:text-orange-700">
              contact us
            </Link>{" "}
            anytime.
          </p>
        </LegalSection>

        <LegalSection heading="Content">
          <p>
            Our Service does not allow you to post, link, store, share and otherwise make available
            certain information, text, graphics, videos, or other material (“Content”).
          </p>
        </LegalSection>

        <LegalSection heading="Links To Other Web Sites">
          <p>
            Our Service may contain links to third-party web sites or services that are not owned or
            controlled by GaugeHow.com.
          </p>
          <p>
            GaugeHow.com has no control over, and assumes no responsibility for, the content,
            privacy policies, or practices of any third party web sites or services. You further
            acknowledge and agree that GaugeHow.com shall not be responsible or liable, directly or
            indirectly, for any damage or loss caused or alleged to be caused by or in connection
            with use of or reliance on any such content, goods or services available on or through
            any such web sites or services.
          </p>
        </LegalSection>

        <LegalSection heading="Changes">
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any
            time. If a revision is material we will try to provide at least 15 days’ notice prior to
            any new terms taking effect. What constitutes a material change will be determined at our
            sole discretion.
          </p>
        </LegalSection>

        <LegalSection heading="Terms and Conditions Modifications">
          <p>GaugeHow reserves the right to modify its terms and conditions without prior notice.</p>
        </LegalSection>

        <LegalSection heading="Lifetime License">
          <p>
            The term “Lifetime” refers specifically to the lifetime of the product, not the buyer’s
            lifetime or any other interpretation of the term. GaugeHow reserves the right to update
            or modify lifetime products at any time without prior notice to customers.
          </p>
        </LegalSection>

        <LegalSection heading="Contact Us">
          <p>
            If you have any questions about these Terms, please contact us at{" "}
            <a href="mailto:info@gaugehow.com" className="font-semibold text-orange-600 hover:text-orange-700">
              info@gaugehow.com
            </a>
            .
          </p>
        </LegalSection>
      </LegalPage>
    </PublicShell>
  );
}
