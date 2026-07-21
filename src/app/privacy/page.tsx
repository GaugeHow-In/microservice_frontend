import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import { LegalPage, LegalSection } from "@/components/shared/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — GaugeHow",
  description:
    "How GaugeHow collects, uses, and protects your personal information when you use gaugehow.com.",
};

export default function PrivacyPage() {
  return (
    <PublicShell>
      <LegalPage
        title="Privacy Policy"
        intro="Your privacy matters to us. This policy explains how gaugehow.com handles your information."
      >
        <LegalSection>
          <p>
            This website gaugehow.com does not automatically capture any specific personal
            information from you (like name, phone number or e-mail address) that allows us to
            identify you individually.
          </p>
          <p>
            You can visit this site without revealing personal information, unless you choose to
            provide such information. Any personal information collected shall be used only for the
            stated purpose.
          </p>
          <p>
            If you choose to provide us with personal information — like filling out a Contact Us
            form with an e-mail address or postal address, and submitting it to us through the web
            portal — we use that information to respond to your message, and to help you get the
            information you have requested.
          </p>
          <p>
            Any information provided to this web portal will be protected from loss, misuse,
            unauthorized access or disclosure, alteration, or destruction.
          </p>
        </LegalSection>

        <LegalSection heading="Links To Other Sites">
          <p>
            This site may contain links to other sites whose data protection and privacy practices
            may differ from ours.
          </p>
          <p>
            We are not responsible for the content and privacy practices of other websites and
            encourage you to consult the privacy notices of those sites. We do not guarantee the
            availability of linked pages at all times. Also, we do not guarantee that linked websites
            comply with Indian Government Web Guidelines.
          </p>
        </LegalSection>

        <LegalSection heading="More Information">
          <p>
            Please also read our{" "}
            <Link href="/terms" className="font-semibold text-orange-600 hover:text-orange-700">
              Terms &amp; Conditions
            </Link>
            . If you have any questions about this Privacy Policy, contact us at{" "}
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
